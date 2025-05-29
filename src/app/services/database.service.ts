import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Chemical {
  id: string;
  name: string;
  originalId: string;
}

export interface EmergencyClass {
  id: string;
  name: string;
  parentClass?: string;
  subClasses: string[];
  description?: string;
  children?: EmergencyClass[];
}

export interface ChemicalClassRelation {
  chemicalId: string;
  classId: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private chemicalsSubject = new BehaviorSubject<Chemical[]>([]);
  private classesSubject = new BehaviorSubject<EmergencyClass[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  public chemicals$ = this.chemicalsSubject.asObservable();
  public classes$ = this.classesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  // Helper method to handle boolean conversion from database
  private convertToBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return false;
  }

  // Helper method to sanitize database results
  private sanitizeDatabaseResult(result: any): any {
    if (!result) return result;
    
    // Convert any string boolean fields to actual booleans
    const sanitized = { ...result };
    
    // Handle any boolean fields that might come from the database as strings
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      // Check if this looks like a boolean that came as a string
      if (typeof value === 'string' && (value === 'true' || value === 'false' || value === '1' || value === '0')) {
        // Only convert if it's clearly meant to be a boolean
        if (value === 'true' || value === '1') {
          sanitized[key] = true;
        } else if (value === 'false' || value === '0') {
          sanitized[key] = false;
        }
      }
    });
    
    return sanitized;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      // Explicitly typed connection parameters
      const dbName: string = 'labsafe_chemicals';
      const encrypted: boolean = false;
      const mode: string = 'no-encryption';
      const version: number = 1;
      const readonly: boolean = false;
      
      this.db = await this.sqlite.createConnection(
        dbName,
        encrypted,
        mode,
        version,
        readonly
      );
      
      await this.db.open();
      await this.createTables();
      await this.loadJsonIntoDatabase();
      await this.loadChemicals();
      await this.loadClasses();
      
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error; // Re-throw to handle in calling code
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createChemicalsTable = `
      CREATE TABLE IF NOT EXISTS chemicals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        original_id TEXT NOT NULL
      );
    `;

    const createClassesTable = `
      CREATE TABLE IF NOT EXISTS emergency_classes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        parent_class TEXT,
        description TEXT
      );
    `;

    const createRelationsTable = `
      CREATE TABLE IF NOT EXISTS chemical_class_relations (
        chemical_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        PRIMARY KEY (chemical_id, class_id),
        FOREIGN KEY (chemical_id) REFERENCES chemicals(id),
        FOREIGN KEY (class_id) REFERENCES emergency_classes(id)
      );
    `;

    await this.db.execute(createChemicalsTable);
    await this.db.execute(createClassesTable);
    await this.db.execute(createRelationsTable);
  }

  private async loadJsonIntoDatabase(): Promise<void> {
    if (!this.db) {
      console.error('Database connection not available for JSON loading');
      return;
    }

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
          // Continue trying other paths
        }
      }
      
      if (!jsonData) {
        throw new Error('Failed to load JSON data from any path');
      }

      await this.processJsonLdData(jsonData);
      
    } catch (error) {
      console.error('Error loading chemical data:', error);
      throw error;
    }
  }

  private async processJsonLdData(jsonData: any): Promise<void> {
    if (!this.db) return;

    let items = [];
    
    if (Array.isArray(jsonData)) {
      items = jsonData;
    } else if (jsonData['@graph']) {
      items = jsonData['@graph'];
    } else if (jsonData.chemicals) {
      items = jsonData.chemicals;
    } else if (jsonData.data) {
      items = jsonData.data;
    } else {
      items = [jsonData];
    }
    
    await this.db.execute('BEGIN TRANSACTION');
    
    try {
      for (const item of items) {
        if (this.isNamedIndividual(item)) {
          await this.insertChemical(item);
        } else if (this.isClass(item)) {
          await this.insertEmergencyClass(item);
        }
      }
      
      // Insert chemical-class relations based on JSON-LD data
      await this.insertChemicalClassRelations(items);
      
      await this.db.execute('COMMIT');
      
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  private async insertChemicalClassRelations(items: any[]): Promise<void> {
    if (!this.db) return;

    for (const item of items) {
      if (this.isNamedIndividual(item)) {
        const chemicalId = this.extractId(item);
        
        // Look for type information that might link to emergency classes
        if (item['@type'] && Array.isArray(item['@type'])) {
          for (const type of item['@type']) {
            if (type !== 'http://www.w3.org/2002/07/owl#NamedIndividual') {
              // This might be a class reference
              const classId = type.startsWith('id#') ? type.substring(3) : type;
              
              try {
                await this.db.run(
                  'INSERT OR IGNORE INTO chemical_class_relations (chemical_id, class_id) VALUES (?, ?)',
                  [chemicalId, classId]
                );
              } catch (error) {
                // Ignore foreign key constraint errors
              }
            }
          }
        }
      }
    }
  }

  private isNamedIndividual(item: any): boolean {
    if (!item['@type']) return false;
    
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    const isIndividual = types.some((type: string) => 
      type === 'http://www.w3.org/2002/07/owl#NamedIndividual' ||
      type.includes('NamedIndividual')
    );
    
    // Additional check to ensure this is actually a chemical substance
    // and not other types of named individuals
    if (isIndividual) {
      const name = this.extractLabel(item) || this.extractNameFromId(this.extractId(item));
      // Filter out non-chemical entities by name patterns or other criteria
      return Boolean(name && !name.toLowerCase().includes('procedure') && 
             !name.toLowerCase().includes('class') &&
             !name.toLowerCase().includes('emergency'));
    }
    
    return false;
  }

  private isClass(item: any): boolean {
    if (!item['@type']) return false;
    
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    return types.some((type: string) => 
      Boolean(type === 'http://www.w3.org/2002/07/owl#Class' ||
      type.includes('Class'))
    );
  }

  private async insertChemical(item: any): Promise<void> {
    if (!this.db) return;
    
    const id = this.extractId(item);
    const name = this.extractLabel(item) || this.extractNameFromId(id);
    
    // Enhanced validation to ensure we're only inserting actual chemicals
    if (!name || 
        name === 'Unknown Chemical' ||
        name.toLowerCase().includes('emergency') ||
        name.toLowerCase().includes('procedure') ||
        name.toLowerCase().includes('class') ||
        name.toLowerCase().includes('response') ||
        name.length < 2) {
      return;
    }
    
    await this.db.run(
      'INSERT OR REPLACE INTO chemicals (id, name, original_id) VALUES (?, ?, ?)',
      [id, name, item['@id'] || id]
    );
  }

  private async insertEmergencyClass(item: any): Promise<void> {
    if (!this.db) return;
    
    const id = this.extractId(item);
    const name = this.extractLabel(item) || this.extractNameFromId(id);
    const parentClass = this.extractParentClass(item);
    const description = this.extractDescription(item);
    
    await this.db.run(
      'INSERT OR REPLACE INTO emergency_classes (id, name, parent_class, description) VALUES (?, ?, ?, ?)',
      [id, name, parentClass, description]
    );
  }

  private extractId(item: any): string {
    if (item['@id']) {
      return item['@id'].startsWith('id#') ? item['@id'].substring(3) : item['@id'];
    }
    return Math.random().toString(36).substring(7);
  }

  private extractLabel(item: any): string | null {
    const labelProperty = 'http://www.w3.org/2000/01/rdf-schema#label';
    
    if (item[labelProperty]) {
      const label = item[labelProperty];
      if (Array.isArray(label) && label.length > 0) {
        return label[0]['@value'] || label[0];
      } else if (typeof label === 'object' && label['@value']) {
        return label['@value'];
      } else if (typeof label === 'string') {
        return label;
      }
    }
    
    return null;
  }

  private extractNameFromId(id: string): string {
    return id
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  private extractParentClass(item: any): string | null {
    const subClassOfProperty = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
    
    if (item[subClassOfProperty]) {
      const parent = item[subClassOfProperty];
      if (Array.isArray(parent) && parent.length > 0) {
        const parentId = parent[0]['@id'];
        return parentId ? (parentId.startsWith('id#') ? parentId.substring(3) : parentId) : null;
      } else if (typeof parent === 'object' && parent['@id']) {
        const parentId = parent['@id'];
        return parentId.startsWith('id#') ? parentId.substring(3) : parentId;
      }
    }
    
    return null;
  }

  private extractDescription(item: any): string | null {
    const commentProperty = 'http://www.w3.org/2000/01/rdf-schema#comment';
    
    if (item[commentProperty]) {
      const comment = item[commentProperty];
      if (Array.isArray(comment) && comment.length > 0) {
        return comment[0]['@value'] || comment[0];
      } else if (typeof comment === 'object' && comment['@value']) {
        return comment['@value'];
      } else if (typeof comment === 'string') {
        return comment;
      }
    }
    
    return null;
  }

  private async loadChemicals(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM chemicals ORDER BY name');
      const chemicals: Chemical[] = (result.values || []).map(chemical => 
        this.sanitizeDatabaseResult(chemical)
      );
      
      this.chemicalsSubject.next(chemicals);
    } catch (error) {
      console.error('Error loading chemicals from database:', error);
      this.chemicalsSubject.next([]);
    }
  }

  private async loadClasses(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM emergency_classes ORDER BY name');
      let classes: EmergencyClass[] = (result.values || []).map(cls => 
        this.sanitizeDatabaseResult(cls)
      );
      
      classes = classes.map(cls => ({
        ...cls,
        subClasses: this.findSubClasses(cls.id, classes)
      }));
      
      this.classesSubject.next(classes);
    } catch (error) {
      console.error('Error loading classes from database:', error);
      this.classesSubject.next([]);
    }
  }

  private findSubClasses(parentId: string, allClasses: any[]): string[] {
    return allClasses
      .filter(cls => cls.parent_class === parentId)
      .map(cls => cls.id);
  }

  public async getChemicalById(id: string): Promise<Chemical | null> {
    if (!this.db) {
      const currentChemicals = this.chemicalsSubject.value;
      return currentChemicals.find(c => c.id === id) || null;
    }

    try {
      const result = await this.db.query('SELECT * FROM chemicals WHERE id = ?', [id]);
      
      if (result.values && result.values.length > 0) {
        return this.sanitizeDatabaseResult(result.values[0]) as Chemical;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting chemical by ID:', error);
      return null;
    }
  }

  public async getEmergencyClassesForChemical(chemicalId: string): Promise<EmergencyClass[]> {
    if (!this.db) return [];

    try {
      // First try to get classes directly linked to the chemical
      const relationResult = await this.db.query(`
        SELECT ec.* FROM emergency_classes ec
        INNER JOIN chemical_class_relations ccr ON ec.id = ccr.class_id
        WHERE ccr.chemical_id = ?
        ORDER BY ec.name
      `, [chemicalId]);

      let classes: EmergencyClass[] = (relationResult.values || []).map(cls => 
        this.sanitizeDatabaseResult(cls)
      );
      
      // If no direct relations found, get all emergency classes as fallback
      if (classes.length === 0) {
        const allClassesResult = await this.db.query(`
          SELECT * FROM emergency_classes 
          ORDER BY name
        `);
        classes = (allClassesResult.values || []).map(cls => 
          this.sanitizeDatabaseResult(cls)
        );
      }
      
      // Build hierarchy
      classes = classes.map(cls => ({
        ...cls,
        subClasses: this.findSubClasses(cls.id, classes)
      }));
      
      return classes;
    } catch (error) {
      console.error('Error getting emergency classes for chemical:', error);
      return [];
    }
  }

  public async getAllEmergencyClasses(): Promise<EmergencyClass[]> {
    return this.classesSubject.value;
  }

  public async reloadDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      if (this.db) {
        await this.db.execute('DELETE FROM chemicals');
        await this.db.execute('DELETE FROM emergency_classes');
        await this.db.execute('DELETE FROM chemical_class_relations');
        await this.loadJsonIntoDatabase();
        await this.loadChemicals();
        await this.loadClasses();
      }
      
    } catch (error) {
      console.error('Error reloading database:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }
}