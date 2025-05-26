import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject, from, Observable } from 'rxjs';

export interface Chemical {
  id: number;
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

  // Blacklist of words to filter out non-chemical entries
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
    "wash", "without", "has", "is"
  ];

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      // Create connection to database
      this.db = await this.sqlite.createConnection(
        'labsafe_chemicals',
        false,
        'no-encryption',
        1,
        false
      );
      
      // Open the database
      await this.db.open();
      
      // Create chemicals table if it doesn't exist
      await this.createTables();
      
      // Load data from JSON file into SQLite
      await this.loadJsonIntoDatabase();
      
      // Load initial data
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
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );
    `;

    await this.db.execute(createTableQuery);
  }

  /**
   * Check if a chemical name contains any blacklisted words
   * @param name The chemical name to check
   * @returns true if the name should be filtered out, false otherwise
   */
  private isBlacklisted(name: string): boolean {
    if (!name || typeof name !== 'string') return true;
    
    const lowerName = name.toLowerCase().trim();
    
    // Skip empty names or very short names (likely not real chemicals)
    if (lowerName.length < 2) return true;
    
    // Check if the name contains any blacklisted words
    return this.blacklistWords.some(blacklistWord => 
      lowerName.includes(blacklistWord.toLowerCase())
    );
  }

  /**
   * Additional validation to ensure the entry looks like a chemical name
   * @param name The chemical name to validate
   * @returns true if it appears to be a valid chemical name
   */
  private isValidChemicalName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    
    const trimmedName = name.trim();
    
    // Basic validation rules for chemical names
    // Skip entries that are obviously not chemicals
    const invalidPatterns = [
      /^\d+$/, // Just numbers
      /^[^a-zA-Z]*$/, // No letters at all
      /^(the|a|an|and|or|but|if|then|when|where|how|why|what)\s/i, // Common articles/words
      /\b(section|page|chapter|step|procedure|method|warning|note|caution)\b/i // Document structure words
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(trimmedName));
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

  // Get all chemicals
  getAllChemicals(): Observable<Chemical[]> {
    return this.chemicals$;
  }

  // Get a specific chemical by ID
  async getChemicalById(id: number): Promise<Chemical | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query('SELECT * FROM chemicals WHERE id = ?', [id]);
      return result.values?.[0] || null;
    } catch (error) {
      console.error('Error getting chemical by ID:', error);
      return null;
    }
  }

  // Search chemicals by name
  searchChemicals(query: string): Observable<Chemical[]> {
    if (!query.trim()) {
      return this.chemicals$;
    }

    return from(this.performSearch(query));
  }

  private async performSearch(query: string): Promise<Chemical[]> {
    if (!this.db) return [];

    try {
      const searchQuery = `
        SELECT * FROM chemicals 
        WHERE name LIKE ? 
        ORDER BY name
      `;
      const result = await this.db.query(searchQuery, [`%${query}%`]);
      return result.values || [];
    } catch (error) {
      console.error('Error searching chemicals:', error);
      return [];
    }
  }

  // Add a new chemical (with blacklist validation)
  async addChemical(name: string): Promise<boolean> {
    if (!this.db || !name.trim()) return false;

    const trimmedName = name.trim();
    
    // Check against blacklist before adding
    if (this.isBlacklisted(trimmedName) || !this.isValidChemicalName(trimmedName)) {
      console.log(`Chemical "${trimmedName}" was rejected due to blacklist or validation rules`);
      return false;
    }

    try {
      await this.db.run('INSERT INTO chemicals (name) VALUES (?)', [trimmedName]);
      await this.loadChemicals(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error adding chemical:', error);
      return false;
    }
  }

  // Delete a chemical
  async deleteChemical(id: number): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.run('DELETE FROM chemicals WHERE id = ?', [id]);
      await this.loadChemicals(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting chemical:', error);
      return false;
    }
  }

  // Get total count
  async getTotalCount(): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.query('SELECT COUNT(*) as count FROM chemicals');
      return result.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Error getting count:', error);
      return 0;
    }
  }

  // Check if database is currently loading
  isLoading(): Observable<boolean> {
    return this.loading$;
  }

  private async loadJsonIntoDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      // Load JSON file from assets
      const response = await fetch('/assets/data/json_database.json');
      const jsonData = await response.json();
      
      // Check if the JSON has the expected structure
      if (jsonData.database?.tables) {
        const chemicalsTable = jsonData.database.tables.find((table: any) => table.name === 'chemicals');
        
        if (chemicalsTable?.values) {
          // Clear existing data
          await this.db.execute('DELETE FROM chemicals');
          
          let filteredCount = 0;
          let totalCount = 0;
          
          // Insert data from JSON with blacklist filtering
          for (const row of chemicalsTable.values) {
            totalCount++;
            
            if (row.length >= 2) { // Ensure we have at least id and name
              const chemicalName = row[1];
              
              // Apply blacklist and validation filters
              if (!this.isBlacklisted(chemicalName) && this.isValidChemicalName(chemicalName)) {
                await this.db.run('INSERT OR REPLACE INTO chemicals (id, name) VALUES (?, ?)', [row[0], chemicalName]);
              } else {
                filteredCount++;
                console.log(`Filtered out: "${chemicalName}"`);
              }
            }
          }
          
          const acceptedCount = totalCount - filteredCount;
          console.log(`Loaded ${acceptedCount} chemicals from JSON database (filtered out ${filteredCount} entries)`);
        }
      }
    } catch (error) {
      console.error('Error loading JSON database:', error);
      console.log('Continuing with empty database...');
    }
  }

  // Reload database - main method that ChemicalListPage calls
  async reloadDatabase(): Promise<void> {
    this.loadingSubject.next(true);
    try {
      await this.loadJsonIntoDatabase();
      await this.loadChemicals();
    } finally {
      this.loadingSubject.next(false);
    }
  }

  // Reload from JSON file (alias for compatibility)
  async reloadFromJsonLd(): Promise<void> {
    await this.reloadDatabase();
  }

  // Clean existing database by removing blacklisted entries
  async cleanExistingDatabase(): Promise<void> {
    if (!this.db) return;

    this.loadingSubject.next(true);
    try {
      // Get all current chemicals
      const result = await this.db.query('SELECT * FROM chemicals');
      const chemicals = result.values || [];
      
      let removedCount = 0;
      
      // Check each chemical against blacklist
      for (const chemical of chemicals) {
        if (this.isBlacklisted(chemical.name) || !this.isValidChemicalName(chemical.name)) {
          await this.db.run('DELETE FROM chemicals WHERE id = ?', [chemical.id]);
          removedCount++;
          console.log(`Removed blacklisted chemical: "${chemical.name}"`);
        }
      }
      
      console.log(`Database cleanup complete. Removed ${removedCount} blacklisted entries.`);
      await this.loadChemicals(); // Refresh the list
      
    } catch (error) {
      console.error('Error cleaning database:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  // Get blacklist statistics
  async getBlacklistStats(): Promise<{total: number, filtered: number, accepted: number}> {
    if (!this.db) return {total: 0, filtered: 0, accepted: 0};

    try {
      // This would require access to original JSON to compare
      // For now, just return current database stats
      const total = await this.getTotalCount();
      return {
        total: total,
        filtered: 0, // Would need original data to calculate
        accepted: total
      };
    } catch (error) {
      console.error('Error getting blacklist stats:', error);
      return {total: 0, filtered: 0, accepted: 0};
    }
  }

  // Close database connection
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}