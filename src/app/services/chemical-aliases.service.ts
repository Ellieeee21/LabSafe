import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface ChemicalAlias {
  id: string;
  mainName: string;
  aliasName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChemicalAliasesService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private aliasesSubject = new BehaviorSubject<ChemicalAlias[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  public aliases$ = this.aliasesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      this.db = await this.sqlite.createConnection(
        'chemical_aliases',
        false,
        'no-encryption',
        1,
        false
      );
      
      await this.db.open();
      await this.createTables();
      await this.loadInitialData();
      
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createAliasesTable = `
      CREATE TABLE IF NOT EXISTS chemical_aliases (
        id TEXT PRIMARY KEY NOT NULL,
        main_name TEXT NOT NULL,
        alias_name TEXT NOT NULL
      );
    `;

    await this.db.execute(createAliasesTable);
  }

  private async loadInitialData(): Promise<void> {
    if (!this.db) return;

    // Check if data already exists
    const result = await this.db.query('SELECT COUNT(*) as count FROM chemical_aliases');
    const count = result.values?.[0]?.count || 0;

    if (count === 0) {
      // Load initial data from JSON
      await this.loadAliasesFromJson();
    } else {
      // Load existing data from database
      await this.loadAllAliases();
    }
  }

  private async loadAliasesFromJson(): Promise<void> {
    try {
      const possiblePaths = [
        '/assets/data/json_database.jsonld',
        'assets/data/json_database.jsonld',
        './assets/data/json_database.jsonld'
      ];

      let jsonData = null;
      for (const path of possiblePaths) {
        try {
          jsonData = await this.http.get<any>(path).toPromise();
          break;
        } catch (e) {
          console.log(`Failed to load from: ${path}`);
        }
      }

      if (!jsonData) {
        throw new Error('Could not load JSON data from any path');
      }

      await this.parseAndStoreAliases(jsonData);
      
    } catch (error) {
      console.error('Error loading aliases from JSON:', error);
    }
  }

  private async parseAndStoreAliases(jsonData: any): Promise<void> {
    if (!this.db) return;

    try {
      let items = [];
      if (Array.isArray(jsonData)) {
        items = jsonData;
      } else if (jsonData['@graph']) {
        items = jsonData['@graph'];
      } else {
        items = [jsonData];
      }

      await this.db.execute('BEGIN TRANSACTION');

      for (const item of items) {
        if (item['http://www.w3.org/2002/07/owl#sameAs']) {
          const mainName = this.extractName(item);
          if (!mainName || mainName === 'Unknown') continue;

          const sameAs = item['http://www.w3.org/2002/07/owl#sameAs'];
          const aliasArray = Array.isArray(sameAs) ? sameAs : [sameAs];

          for (const alias of aliasArray) {
            if (alias['@id']) {
              const aliasName = this.extractNameFromId(alias['@id']);
              if (aliasName && aliasName !== mainName) {
                const id = `${mainName}_${aliasName}`.replace(/\s+/g, '_');
                await this.db.run(
                  'INSERT INTO chemical_aliases (id, main_name, alias_name) VALUES (?, ?, ?)',
                  [id, mainName, aliasName]
                );
              }
            }
          }
        }
      }

      await this.db.execute('COMMIT');
      await this.loadAllAliases();

    } catch (error) {
      console.error('Error parsing and storing aliases:', error);
      if (this.db) {
        await this.db.execute('ROLLBACK');
      }
    }
  }

  private extractName(item: any): string {
    if (item['http://www.w3.org/2000/01/rdf-schema#label']) {
      const label = item['http://www.w3.org/2000/01/rdf-schema#label'];
      if (Array.isArray(label) && label[0]?.['@value']) {
        return label[0]['@value'];
      } else if (label['@value']) {
        return label['@value'];
      }
    }
    
    if (item['@id']) {
      return this.extractNameFromId(item['@id']);
    }

    return 'Unknown';
  }

  private extractNameFromId(id: string): string {
    if (!id) return 'Unknown';
    
    let name = id.startsWith('id#') ? id.substring(3) : id;
    name = name
      .replace(/\.\./g, ', ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .trim();
      
    return name;
  }

  private async loadAllAliases(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM chemical_aliases');
      const aliases: ChemicalAlias[] = (result.values || []).map(row => ({
        id: row.id,
        mainName: row.main_name,
        aliasName: row.alias_name
      }));
      
      this.aliasesSubject.next(aliases);
    } catch (error) {
      console.error('Error loading aliases from database:', error);
      this.aliasesSubject.next([]);
    }
  }

  public async getMainChemicalName(name: string): Promise<string> {
    const normalizedInput = this.normalizeChemicalName(name);
    
    // First check if it's already a main name
    const mainNameResult = await this.db?.query(
      'SELECT main_name FROM chemical_aliases WHERE main_name = ? LIMIT 1',
      [name]
    );
    
    if (mainNameResult?.values?.length) {
      return mainNameResult.values[0].main_name;
    }
    
    // Then check if it's an alias
    const aliasResult = await this.db?.query(
      'SELECT main_name FROM chemical_aliases WHERE alias_name = ? LIMIT 1',
      [name]
    );
    
    if (aliasResult?.values?.length) {
      return aliasResult.values[0].main_name;
    }
    
    // If not found in database, try with normalized name
    const allAliases = this.aliasesSubject.value;
    for (const alias of allAliases) {
      if (this.normalizeChemicalName(alias.mainName) === normalizedInput) {
        return alias.mainName;
      }
      if (this.normalizeChemicalName(alias.aliasName) === normalizedInput) {
        return alias.mainName;
      }
    }
    
    return name;
  }

  public async getAllPossibleNamesForChemical(chemicalName: string): Promise<string[]> {
    const allNames = new Set<string>();
    const mainName = await this.getMainChemicalName(chemicalName);
    
    // Add the main chemical name
    allNames.add(mainName);
    
    // Get all aliases from database
    const result = await this.db?.query(
      'SELECT alias_name FROM chemical_aliases WHERE main_name = ?',
      [mainName]
    );
    
    if (result?.values) {
      result.values.forEach(row => allNames.add(row.alias_name));
    }

    // Handle special formatting cases
    if (chemicalName.includes(',')) {
      const parts = chemicalName.split(',').map(part => part.trim());
      allNames.add(parts.join(' '));
      allNames.add(parts.reverse().join(' '));
      allNames.add(parts[0]);
      if (parts[1]) allNames.add(parts[1]);
    }

    if (chemicalName.includes('(') || chemicalName.includes('[')) {
      const cleanName = chemicalName.replace(/[\[\]()]/g, '').trim();
      allNames.add(cleanName);
      
      const bracketContent = chemicalName.match(/\[([^\]]+)\]/);
      if (bracketContent) {
        allNames.add(bracketContent[1]);
      }
      
      const parenContent = chemicalName.match(/\(([^)]+)\)/);
      if (parenContent) {
        allNames.add(parenContent[1]);
      }
    }

    if (chemicalName.includes('..')) {
      const withComma = chemicalName.replace('..', ', ');
      allNames.add(withComma);
      const withSpace = chemicalName.replace('..', ' ');
      allNames.add(withSpace);
    }

    return Array.from(allNames);
  }

  public normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  public async reloadDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      if (this.db) {
        await this.db.execute('DELETE FROM chemical_aliases');
        await this.loadAliasesFromJson();
      }
      
    } catch (error) {
      console.error('Error reloading database:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }
}