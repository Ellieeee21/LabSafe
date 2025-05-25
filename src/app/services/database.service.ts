import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

interface Chemical {
  id: number;
  name: string;
}

interface EmergencyType {
  id: number;
  name: string;
}

interface FirstAidStep {
  id: number;
  chemical_id: number;
  emergency_type_id: number;
  step_order: number;
  step: string;
}

// Add OWL/JSON-LD interfaces for your ontology data
interface OWLEntity {
  "@id": string;
  "@type": string[];
  "http://www.w3.org/2000/01/rdf-schema#label"?: Array<{ "@value": string }>;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private isDbReady = false;
  private dbInitPromise: Promise<void> | null = null;

  constructor() {
    this.dbInitPromise = this.initializeDatabase();
  }

  async initializeDatabase(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        await this.sqlite.initWebStore();
      }

      // Open database
      this.db = await this.sqlite.createConnection(
        'labsafe-db',
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      // Create tables
      await this.createTables();
      
      // Insert initial data
      await this.insertInitialData();
      
      this.isDbReady = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) return;

    // Create emergency_types table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS emergency_types (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );
    `);

    // Create chemicals table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS chemicals (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        owl_id TEXT UNIQUE,
        label TEXT
      );
    `);

    // Create first_aid_steps table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS first_aid_steps (
        id INTEGER PRIMARY KEY NOT NULL,
        chemical_id INTEGER,
        emergency_type_id INTEGER,
        step_order INTEGER,
        step TEXT NOT NULL,
        FOREIGN KEY (chemical_id) REFERENCES chemicals(id),
        FOREIGN KEY (emergency_type_id) REFERENCES emergency_types(id)
      );
    `);
  }

  private async insertInitialData() {
    if (!this.db) return;

    try {
      // Check if data already exists
      const emergencyTypesResult = await this.db.query('SELECT COUNT(*) as count FROM emergency_types');
      if (emergencyTypesResult.values && emergencyTypesResult.values[0].count > 0) {
        return; // Data already exists
      }

      // Insert emergency types
      const emergencyTypes = [
        'Eye Contact',
        'Fire Fighting',
        'Flammability',
        'Ingestion',
        'Inhalation',
        'Instability or Reactivity',
        'Skin Contact'
      ];

      for (let i = 0; i < emergencyTypes.length; i++) {
        await this.db.run(
          'INSERT INTO emergency_types (id, name) VALUES (?, ?)',
          [i + 1, emergencyTypes[i]]
        );
      }

      // Insert sample chemicals
      const chemicals = [
        'Acetone',
        'Benzene',
        'Hydrochloric Acid',
        'Sodium Hydroxide',
        'Methanol',
        'Sulfuric Acid',
        'Ammonia',
        'Formaldehyde'
      ];

      for (let i = 0; i < chemicals.length; i++) {
        await this.db.run(
          'INSERT INTO chemicals (id, name) VALUES (?, ?)',
          [i + 1, chemicals[i]]
        );
      }

      // Insert sample first aid steps for Acetone (Eye Contact)
      const acetoneSteps = [
        'Check and remove contact lenses',
        'Flush eyes with cold water for 15 minutes',
        'Seek medical attention'
      ];

      for (let i = 0; i < acetoneSteps.length; i++) {
        await this.db.run(
          'INSERT INTO first_aid_steps (id, chemical_id, emergency_type_id, step_order, step) VALUES (?, ?, ?, ?, ?)',
          [i + 1, 1, 1, i + 1, acetoneSteps[i]]
        );
      }

      // Add more sample steps for other scenarios
      await this.addMoreSampleSteps();

    } catch (error) {
      console.error('Error inserting initial data:', error);
    }
  }

  private async addMoreSampleSteps() {
    if (!this.db) return;

    // Acetone - Skin Contact
    const acetoneSkinSteps = [
      'Remove contaminated clothing',
      'Wash skin with soap and water for 15 minutes',
      'If irritation persists, seek medical attention'
    ];

    for (let i = 0; i < acetoneSkinSteps.length; i++) {
      await this.db.run(
        'INSERT INTO first_aid_steps (chemical_id, emergency_type_id, step_order, step) VALUES (?, ?, ?, ?)',
        [1, 7, i + 1, acetoneSkinSteps[i]]
      );
    }

    // Acetone - Inhalation
    const acetoneInhalationSteps = [
      'Move person to fresh air',
      'If breathing is difficult, give oxygen',
      'Seek immediate medical attention'
    ];

    for (let i = 0; i < acetoneInhalationSteps.length; i++) {
      await this.db.run(
        'INSERT INTO first_aid_steps (chemical_id, emergency_type_id, step_order, step) VALUES (?, ?, ?, ?)',
        [1, 5, i + 1, acetoneInhalationSteps[i]]
      );
    }
  }

  async getChemicals(): Promise<Chemical[]> {
    await this.waitForDatabase();

    try {
      const result = await this.db!.query('SELECT * FROM chemicals ORDER BY name');
      return result.values || [];
    } catch (error) {
      console.error('Error getting chemicals:', error);
      return [];
    }
  }

  async getChemicalById(id: number): Promise<Chemical | null> {
    await this.waitForDatabase();

    try {
      const result = await this.db!.query('SELECT * FROM chemicals WHERE id = ?', [id]);
      return result.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      console.error('Error getting chemical by id:', error);
      return null;
    }
  }

  async getEmergencyTypes(): Promise<EmergencyType[]> {
    await this.waitForDatabase();

    try {
      const result = await this.db!.query('SELECT * FROM emergency_types ORDER BY name');
      return result.values || [];
    } catch (error) {
      console.error('Error getting emergency types:', error);
      return [];
    }
  }

  async getFirstAidStepsByChemical(chemicalId: number): Promise<FirstAidStep[]> {
    await this.waitForDatabase();

    try {
      const result = await this.db!.query(
        'SELECT * FROM first_aid_steps WHERE chemical_id = ? ORDER BY emergency_type_id, step_order',
        [chemicalId]
      );
      return result.values || [];
    } catch (error) {
      console.error('Error getting first aid steps:', error);
      return [];
    }
  }

  private async waitForDatabase(): Promise<void> {
    if (this.dbInitPromise) {
      await this.dbInitPromise;
    }
    
    if (!this.isDbReady) {
      return new Promise((resolve) => {
        const checkDb = () => {
          if (this.isDbReady) {
            resolve();
          } else {
            setTimeout(checkDb, 100);
          }
        };
        checkDb();
      });
    }
  }

  // Method to import OWL/JSON-LD data
  async importFromOWL(owlData: OWLEntity[]) {
    await this.waitForDatabase();

    try {
      // Process OWL entities and extract chemical information
      const chemicals = owlData.filter(entity => 
        entity["@type"] && 
        entity["@type"].includes("http://www.w3.org/2002/07/owl#NamedIndividual") &&
        entity["http://www.w3.org/2000/01/rdf-schema#label"]
      );

      // Clear existing chemical data if needed
      await this.db!.execute('DELETE FROM chemicals WHERE owl_id IS NOT NULL');

      // Import chemicals from OWL data
      let chemicalId = 1000; // Start from high number to avoid conflicts
      for (const chemical of chemicals) {
        const label = chemical["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.["@value"];
        if (label) {
          await this.db!.run(
            'INSERT INTO chemicals (id, name, owl_id, label) VALUES (?, ?, ?, ?)',
            [chemicalId++, label, chemical["@id"], label]
          );
        }
      }

      console.log('OWL data imported successfully');
    } catch (error) {
      console.error('Error importing OWL data:', error);
      throw error;
    }
  }

  // Method to load OWL JSON file
  async loadOWLData(jsonFilePath: string) {
    try {
      const response = await fetch(jsonFilePath);
      const owlData = await response.json();
      await this.importFromOWL(owlData);
    } catch (error) {
      console.error('Error loading OWL data:', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async importFromJson(jsonData: any) {
    await this.waitForDatabase();

    try {
      // Clear existing data if needed (optional)
      await this.db!.execute('DELETE FROM first_aid_steps');
      await this.db!.execute('DELETE FROM chemicals WHERE owl_id IS NULL');
      await this.db!.execute('DELETE FROM emergency_types');

      // Import from JSON
      const tables = jsonData.tables;

      // Import emergency types
      const emergencyTypesTable = tables.find((table: any) => table.name === 'emergency_types');
      if (emergencyTypesTable) {
        for (const value of emergencyTypesTable.values) {
          await this.db!.run(
            'INSERT INTO emergency_types (id, name) VALUES (?, ?)',
            value
          );
        }
      }

      // Import chemicals
      const chemicalsTable = tables.find((table: any) => table.name === 'chemicals');
      if (chemicalsTable) {
        for (const value of chemicalsTable.values) {
          await this.db!.run(
            'INSERT INTO chemicals (id, name) VALUES (?, ?)',
            value
          );
        }
      }

      // Import first aid steps
      const stepsTable = tables.find((table: any) => table.name === 'first_aid_steps');
      if (stepsTable) {
        for (const value of stepsTable.values) {
          await this.db!.run(
            'INSERT INTO first_aid_steps (id, chemical_id, emergency_type_id, step_order, step) VALUES (?, ?, ?, ?, ?)',
            value
          );
        }
      }

      console.log('Data imported successfully from JSON');
    } catch (error) {
      console.error('Error importing data from JSON:', error);
      throw error;
    }
  }

  async loadJsonData(jsonFilePath: string) {
    try {
      const response = await fetch(jsonFilePath);
      const jsonData = await response.json();
      await this.importFromJson(jsonData);
    } catch (error) {
      console.error('Error loading JSON data:', error);
      throw error;
    }
  }
}