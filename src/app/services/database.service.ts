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

  // Added missing loadChemicals method
  private async loadChemicals(): Promise<void> {
    if (!this.db) {
      console.error('Database connection not available for loading chemicals');
      return;
    }

    try {
      const result = await this.db.query('SELECT * FROM chemicals ORDER BY name');
      const chemicals: Chemical[] = result.values || [];
      
      console.log(`Loaded ${chemicals.length} chemicals from database`);
      this.chemicalsSubject.next(chemicals);
    } catch (error) {
      console.error('Error loading chemicals from database:', error);
      this.chemicalsSubject.next([]);
    }
  }

  // Added the missing getChemicalById method
  public async getChemicalById(id: string): Promise<Chemical | null> {
    if (!this.db) {
      console.error('Database connection not available for getting chemical by ID');
      return null;
    }

    try {
      const result = await this.db.query('SELECT * FROM chemicals WHERE id = ?', [id]);
      
      if (result.values && result.values.length > 0) {
        return result.values[0] as Chemical;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting chemical by ID:', error);
      return null;
    }
  }

  // Added missing reloadDatabase method
  public async reloadDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      this.loadingSubject.next(true);
      
      // Clear existing data and reload from JSON
      await this.db.execute('DELETE FROM chemicals');
      await this.loadJsonIntoDatabase();
      await this.loadChemicals();
      
      console.log('Database reloaded successfully');
    } catch (error) {
      console.error('Error reloading database:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async loadJsonIntoDatabase(): Promise<void> {
    if (!this.db) {
      console.error('Database connection not available for JSON loading');
      return;
    }

    try {
      console.log('Fetching JSON data from /assets/data/json_database...');
      const response = await fetch('/assets/data/json_database');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      console.log(`JSON data loaded. Type: ${typeof jsonData}, Length: ${Array.isArray(jsonData) ? jsonData.length : 'Not an array'}`);
      
      // Log the structure of the first item
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log('First item structure:', Object.keys(jsonData[0]));
        console.log('First item sample:', JSON.stringify(jsonData[0], null, 2));
      }
      
      await this.db.execute('DELETE FROM chemicals');
      console.log('Cleared existing chemicals from database');
      
      let chemicalCount = 0;

      // Simplified approach - try to extract any name-like properties
      for (let i = 0; i < Math.min(jsonData.length, 100); i++) { // Limit to first 100 for testing
        const item = jsonData[i];
        
        // Try different possible name fields
        const possibleNames = [
          item.name,
          item.title,
          item.label,
          item.chemical_name,
          item.substance_name,
          // Add JSON-LD paths if they exist
          ...(item['http://www.w3.org/2000/01/rdf-schema#label'] || []).map((x: any) => x['@value']),
          ...(item['http://purl.org/dc/terms/title'] || []).map((x: any) => x['@value'])
        ].filter(name => name && typeof name === 'string' && name.trim().length > 1);

        for (const name of possibleNames) {
          if (name && name.length > 1) {
            const chemicalId = item['@id'] || item.id || `chem-${chemicalCount + 1}`;
            
            try {
              await this.db.run(
                'INSERT OR IGNORE INTO chemicals (id, name) VALUES (?, ?)',
                [chemicalId, name.trim()]
              );
              chemicalCount++;
              
              if (chemicalCount <= 10) {
                console.log(`Added chemical #${chemicalCount}: "${name}" (ID: ${chemicalId})`);
              }
              
              break; // Only add the first valid name per item
            } catch (insertError) {
              console.error(`Error inserting chemical "${name}":`, insertError);
            }
          }
        }
      }

      console.log(`Processing complete! Loaded ${chemicalCount} chemicals`);
      
      // Verify data was actually inserted
      const countResult = await this.db.query('SELECT COUNT(*) as count FROM chemicals');
      const actualCount = countResult.values?.[0]?.count || 0;
      console.log(`Database verification: ${actualCount} chemicals actually in database`);
      
      // Show a few examples
      const sampleResult = await this.db.query('SELECT * FROM chemicals LIMIT 5');
      console.log('Sample chemicals in DB:', sampleResult.values);
      
    } catch (error) {
      console.error('Error loading chemical data:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('File not found. Check that json_database is in src/assets/data/');
      }
    }
  }
}