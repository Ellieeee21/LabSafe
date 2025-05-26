import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject, from, Observable } from 'rxjs';

export interface Chemical {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private chemicalsSubject = new BehaviorSubject<Chemical[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  public chemicals$ = this.chemicalsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  private readonly blacklistWords = [
    "avoid", "accidental", "allow", "absorb", "apply", "artificial", "call for assistance", "check",
    "clean", "combustible", "condition", "cool vessel", "dilute", "direct", "dispose",
    "divert", "do not", "emergency", "environmental", "examine", "exposure", "first aid",
    "flammability", "flush", "get medical attention", "give oxygen", "global", "health",
    "health hazard", "health level", "high temperature", "incompatibility", "indepth",
    "ingestion", "instability", "keep away", "keep substance", "loose tight clothing",
    "mouth", "NFPA704", "neutralize", "never apply", "never touch", "physical hazard",
    "place in", "prevent", "product name", "remove", "rest", "section", "small spill",
    "special notice", "special", "stop", "strong", "use", "warm water", "wash clothing",
    "wash", "without", "has", "is", "warning", "note", "caution", "procedure", "method"
  ];

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      this.db = await this.sqlite.createConnection(
        'labsafe_chemicals',
        false,
        'no-encryption',
        1,
        false
      );
      
      await this.db.open();
      await this.createTables();
      await this.loadJsonIntoDatabase();
      await this.loadChemicals();
      
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS chemicals (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        UNIQUE(id) ON CONFLICT REPLACE
      );
    `;

    await this.db.execute(createTableQuery);
  }

  private isBlacklisted(name: string): boolean {
    if (!name || typeof name !== 'string') return true;
    
    const lowerName = name.toLowerCase().trim();
    
    if (lowerName.length < 2) return true;
    
    return this.blacklistWords.some(blacklistWord => 
      lowerName.includes(blacklistWord.toLowerCase())
    );
  }

  private isValidChemicalName(name: string): boolean {
    if (!name || name.length < 2) return false;
    
    const chemicalPatterns = [
      /^[A-Za-z0-9,\-\(\)\s]+$/,
      /^[A-Z][a-z]?\d*/,
      /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/
    ];

    const invalidPatterns = [
      /^\d+$/,
      /^[^a-zA-Z]*$/,
      /^(the|a|an|and|or|but)\s/i,
      /[\(\)]\s*[\(\)]/,
      /\b(section|page|chapter)\b/i
    ];

    const isChemical = chemicalPatterns.some(p => p.test(name));
    const isInvalid = invalidPatterns.some(p => p.test(name));
    
    return isChemical && !isInvalid;
  }

  private async loadJsonIntoDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      const response = await fetch('/assets/data/json_database.json');
      const jsonData = await response.json();
      
      await this.db.execute('DELETE FROM chemicals');
      
      let chemicalCount = 0;
      let filteredCount = 0;

      for (const item of jsonData) {
        const potentialNames = [
          ...(item['http://www.w3.org/2000/01/rdf-schema#label'] || []),
          ...(item['http://www.w3.org/2000/01/rdf-schema#comment'] || []),
          ...(item['http://purl.org/dc/terms/title'] || [])
        ];

        for (const nameObj of potentialNames) {
          if (nameObj['@value']) {
            const chemicalName = nameObj['@value'].trim();
            
            if (this.isValidChemicalName(chemicalName) && !this.isBlacklisted(chemicalName)) {
              const chemicalId = item['@id'] || `chem-${chemicalCount + 1}`;
              
              await this.db.run(
                'INSERT INTO chemicals (id, name) VALUES (?, ?)',
                [chemicalId, chemicalName]
              );
              chemicalCount++;
            } else {
              filteredCount++;
            }
          }
        }
      }

      console.log(`Loaded ${chemicalCount} chemicals (filtered ${filteredCount} entries)`);
      
    } catch (error) {
      console.error('Error loading chemical data:', error);
    }
  }

  private async loadChemicals(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM chemicals ORDER BY name');
      const chemicals: Chemical[] = result.values || [];
      this.chemicalsSubject.next(chemicals);
    } catch (error) {
      console.error('Error loading chemicals:', error);
      this.chemicalsSubject.next([]);
    }
  }

  async reloadDatabase(): Promise<void> {
    this.loadingSubject.next(true);
    try {
      await this.loadJsonIntoDatabase();
      await this.loadChemicals();
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async getChemicalById(id: number | string): Promise<Chemical | null> {
  if (!this.db) return null;

  try {
    // Handle both string and numeric IDs
    const query = typeof id === 'number' 
      ? 'SELECT * FROM chemicals WHERE rowid = ?' 
      : 'SELECT * FROM chemicals WHERE id = ?';
    
    const result = await this.db.query(query, [id]);
    return result.values?.[0] || null;
  } catch (error) {
    console.error('Error getting chemical by ID:', error);
    return null;
  }
}
}