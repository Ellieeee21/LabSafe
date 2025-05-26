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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `;

    await this.db.execute(createTableQuery);
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

  // Add a new chemical
  async addChemical(name: string): Promise<boolean> {
    if (!this.db || !name.trim()) return false;

    try {
      await this.db.run('INSERT INTO chemicals (name) VALUES (?)', [name.trim()]);
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

  // Reload chemicals
  async reloadDatabase(): Promise<void> {
    await this.loadChemicals();
  }

  // Close database connection
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}