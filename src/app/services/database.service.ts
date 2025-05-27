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

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      console.log('Initializing database...');
      
      this.db = await this.sqlite.createConnection(
        'labsafe_chemicals',
        false,
        'no-encryption',
        1,
        false
      );
      
      await this.db.open();
      console.log('Database connection opened');
      
      await this.createTables();
      console.log('Tables created');
      
      await this.loadJsonIntoDatabase();
      console.log('JSON data loaded');
      
      await this.loadChemicals();
      console.log('Chemicals loaded into observable');
      
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
    console.log('Chemical table created/verified');
  }

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
      console.log('Fetching JSON data...');
      
      // Try multiple possible paths for the JSON file
      const possiblePaths = [
        './assets/data/json_database.json',  // With extension
        './assets/data/json_database',       // Without extension (original)
        '/assets/data/json_database.json',   // Absolute with extension
        '/assets/data/json_database'         // Absolute without extension (original)
      ];

      let jsonData = null;
      let successfulPath = '';

      for (const path of possiblePaths) {
        try {
          console.log(`Trying to fetch from: ${path}`);
          const response = await fetch(path);
          
          if (response.ok) {
            jsonData = await response.json();
            successfulPath = path;
            console.log(`Successfully loaded data from: ${path}`);
            break;
          } else {
            console.log(`Failed to fetch from ${path}: ${response.status}`);
          }
        } catch (fetchError) {
          console.log(`Error fetching from ${path}:`, fetchError);
        }
      }

      if (!jsonData) {
        throw new Error('Could not load JSON data from any of the attempted paths');
      }
      
      console.log(`JSON data loaded from ${successfulPath}. Type: ${typeof jsonData}, Length: ${Array.isArray(jsonData) ? jsonData.length : 'Not an array'}`);
      
      // Log the structure of the first few items
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log('Sample data structure:');
        for (let i = 0; i < Math.min(3, jsonData.length); i++) {
          console.log(`Item ${i}:`, Object.keys(jsonData[i]));
          console.log(`Sample content:`, JSON.stringify(jsonData[i], null, 2).substring(0, 500));
        }
      }
      
      await this.db.execute('DELETE FROM chemicals');
      console.log('Cleared existing chemicals from database');
      
      let chemicalCount = 0;

      // Process each item in the JSON array
      for (let i = 0; i < jsonData.length; i++) {
        const item = jsonData[i];
        
        // Extract possible chemical names from various fields
        const extractedNames = this.extractChemicalNames(item);
        
        if (extractedNames.length > 0) {
          // Use the first valid name found
          const chemicalName = extractedNames[0];
          const chemicalId = item['@id'] || item.id || `chemical-${Date.now()}-${i}`;
          
          try {
            await this.db.run(
              'INSERT OR IGNORE INTO chemicals (id, name) VALUES (?, ?)',
              [chemicalId, chemicalName.trim()]
            );
            chemicalCount++;
            
            if (chemicalCount <= 10) {
              console.log(`Added chemical #${chemicalCount}: "${chemicalName}" (ID: ${chemicalId})`);
            }
          } catch (insertError) {
            console.error(`Error inserting chemical "${chemicalName}":`, insertError);
          }
        }
      }

      console.log(`Processing complete! Attempted to load ${chemicalCount} chemicals`);
      
      // Verify data was actually inserted
      const countResult = await this.db.query('SELECT COUNT(*) as count FROM chemicals');
      const actualCount = countResult.values?.[0]?.count || 0;
      console.log(`Database verification: ${actualCount} chemicals actually in database`);
      
      // Show sample data
      if (actualCount > 0) {
        const sampleResult = await this.db.query('SELECT * FROM chemicals LIMIT 5');
        console.log('Sample chemicals in DB:', sampleResult.values);
      }
      
    } catch (error) {
      console.error('Error loading chemical data:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Fetch error - check file path and ensure json_database file exists in assets/data/');
      }
      
      throw error;
    }
  }

  private extractChemicalNames(item: any): string[] {
    const names: string[] = [];
    
    // Try direct properties first
    const directProps = ['name', 'title', 'label', 'chemical_name', 'substance_name'];
    for (const prop of directProps) {
      if (item[prop] && typeof item[prop] === 'string' && item[prop].trim().length > 1) {
        names.push(item[prop].trim());
      }
    }
    
    // Try JSON-LD properties
    const jsonLdProps = [
      'http://www.w3.org/2000/01/rdf-schema#label',
      'http://purl.org/dc/terms/title',
      'http://xmlns.com/foaf/0.1/name',
      'http://www.w3.org/2004/02/skos/core#prefLabel'
    ];
    
    for (const prop of jsonLdProps) {
      if (item[prop]) {
        if (Array.isArray(item[prop])) {
          for (const entry of item[prop]) {
            if (typeof entry === 'object' && entry['@value']) {
              names.push(entry['@value'].trim());
            } else if (typeof entry === 'string') {
              names.push(entry.trim());
            }
          }
        } else if (typeof item[prop] === 'string') {
          names.push(item[prop].trim());
        }
      }
    }
    
    // Filter out invalid names and return unique valid names
    return [...new Set(names.filter(name => this.isValidChemicalName(name)))];
  }

  private isValidChemicalName(name: string): boolean {
    if (!name || typeof name !== 'string' || name.length < 2) {
      return false;
    }
    
    const trimmedName = name.trim().toLowerCase();
    
    // Skip very short names
    if (trimmedName.length < 2) return false;
    
    // Skip common non-chemical terms
    const blacklistTerms = [
      'section', 'page', 'chapter', 'note', 'warning', 'caution',
      'emergency', 'first aid', 'safety', 'hazard', 'exposure',
      'procedure', 'method', 'use', 'avoid', 'keep', 'wash',
      'remove', 'apply', 'clean', 'flush'
    ];
    
    const containsBlacklisted = blacklistTerms.some(term => 
      trimmedName.includes(term)
    );
    
    if (containsBlacklisted) return false;
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;
    
    // Skip if it's just numbers
    if (/^\d+$/.test(trimmedName)) return false;
    
    return true;
  }
}