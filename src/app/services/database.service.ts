import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Chemical {
  id: number;
  name: string;
  formula?: string;
  casNumber?: string;
  hazards?: string;
  precautions?: string;
  firstAid?: string;
  description?: string;
  hazardClass?: string;
  storageClass?: string;
  riskPhrases?: string;
  safetyPhrases?: string;
  type?: string;
  molecularWeight?: string;
  meltingPoint?: string;
  boilingPoint?: string;
  density?: string;
  solubility?: string;
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

  constructor(private http: HttpClient) {
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
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        formula TEXT,
        cas_number TEXT,
        hazards TEXT,
        precautions TEXT,
        first_aid TEXT,
        description TEXT,
        hazard_class TEXT,
        storage_class TEXT,
        risk_phrases TEXT,
        safety_phrases TEXT,
        type TEXT,
        molecular_weight TEXT,
        melting_point TEXT,
        boiling_point TEXT,
        density TEXT,
        solubility TEXT
      );
    `;

    await this.db.execute(createTableQuery);
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

  public async getChemicalById(id: number): Promise<Chemical | null> {
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
      // Load the JSON-LD file
      const jsonData = await this.http.get<any>('/assets/data/json_database').toPromise();
      
      if (!jsonData) {
        throw new Error('Failed to load JSON data');
      }

      // Process the JSON-LD data similar to Java version
      const chemicals = this.parseJsonLdData(jsonData);
      
      // Insert chemicals into database
      await this.db.execute('BEGIN TRANSACTION');
      for (const chemical of chemicals) {
        await this.insertChemical(chemical);
      }
      await this.db.execute('COMMIT');
      
      console.log(`Inserted ${chemicals.length} chemicals into database`);
      
    } catch (error) {
      console.error('Error loading chemical data:', error);
      if (this.db) {
        await this.db.execute('ROLLBACK');
      }
    }
  }

  private parseJsonLdData(jsonData: any): Chemical[] {
    const chemicals: Chemical[] = [];
    
    // Handle both array and single object formats
    const items = Array.isArray(jsonData) ? jsonData : 
                 jsonData['@graph'] ? jsonData['@graph'] : 
                 [jsonData];
    
    for (const item of items) {
      try {
        if (!this.isChemicalObject(item)) continue;
        
        const chemical = this.parseChemicalFromJsonLd(item);
        if (chemical) {
          chemicals.push(chemical);
        }
      } catch (e) {
        console.error('Error parsing chemical:', e);
      }
    }
    
    return chemicals;
  }

  private isChemicalObject(jsonObject: any): boolean {
    // Similar logic to Java version
    if (jsonObject['@type']) {
      const types = Array.isArray(jsonObject['@type']) ? 
                   jsonObject['@type'] : 
                   [jsonObject['@type']];
      
      const chemicalIndicators = [
        'Chemical', 'ChemicalSubstance', 'Compound', 'Element', 
        'Substance', 'Material', 'Reagent', 'NamedIndividual', 'Individual'
      ];
      
      if (types.some((t: string) => 
          chemicalIndicators.some(ind => t.includes(ind)))) {
        return true;
      }
    }
    
    // Check for rdfs:label
    if (jsonObject['http://www.w3.org/2000/01/rdf-schema#label']) {
      return true;
    }
    
    // Check for chemical identifiers
    return jsonObject.name && 
          (jsonObject.molecularFormula || jsonObject.formula || jsonObject.casNumber);
  }

  private parseChemicalFromJsonLd(jsonObject: any): Chemical | null {
    try {
      // Generate ID from @id or name
      const idString = jsonObject['@id'] || jsonObject.id || jsonObject.name;
      const id = Math.abs(this.hashCode(idString));
      
      // Extract name from various possible locations
      const name = this.extractName(jsonObject);
      if (!name || name === 'Unknown Chemical') return null;
      
      // Extract other properties
      const formula = this.extractValue(jsonObject, 'molecularFormula') || 
                     this.extractValue(jsonObject, 'formula') || 
                     this.extractValue(jsonObject, 'chemicalFormula');
      
      const casNumber = this.extractValue(jsonObject, 'casNumber');
      const hazards = this.extractHazards(jsonObject);
      const precautions = this.extractPrecautions(jsonObject);
      const description = this.extractDescription(jsonObject);
      
      return {
        id,
        name,
        formula,
        casNumber,
        hazards,
        precautions,
        firstAid: this.extractValue(jsonObject, 'firstAid'),
        description,
        hazardClass: this.extractValue(jsonObject, 'hazardClass'),
        storageClass: this.extractValue(jsonObject, 'storageClass'),
        riskPhrases: this.extractValue(jsonObject, 'riskPhrases'),
        safetyPhrases: this.extractValue(jsonObject, 'safetyPhrases'),
        type: this.extractValue(jsonObject, 'type'),
        molecularWeight: this.extractValue(jsonObject, 'molecularWeight'),
        meltingPoint: this.extractValue(jsonObject, 'meltingPoint'),
        boilingPoint: this.extractValue(jsonObject, 'boilingPoint'),
        density: this.extractValue(jsonObject, 'density'),
        solubility: this.extractValue(jsonObject, 'solubility')
      };
    } catch (e) {
      console.error('Error parsing chemical:', e);
      return null;
    }
  }

  private extractName(jsonObject: any): string {
    // Try rdfs:label first
    let name = this.extractValue(jsonObject, 'http://www.w3.org/2000/01/rdf-schema#label');
    if (name) return name;
    
    // Try other common name properties
    name = this.extractValue(jsonObject, 'name') || 
          this.extractValue(jsonObject, 'http://schema.org/name') || 
          this.extractValue(jsonObject, 'title');
    
    if (name) return name;
    
    // Try to extract from @id as last resort
    if (jsonObject['@id']) {
      const id = jsonObject['@id'];
      if (id.startsWith('id#')) {
        return id.substring(3)
          .replace(/\.\./g, '')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/([0-9])([A-Z])/g, '$1 $2')
          .trim();
      }
    }
    
    return 'Unknown Chemical';
  }

  private extractValue(jsonObject: any, property: string): string | undefined {
    if (!jsonObject[property]) return undefined;
    
    const value = jsonObject[property];
    
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) {
      if (typeof value[0] === 'string') return value[0];
      if (value[0]['@value']) return value[0]['@value'];
    }
    if (value['@value']) return value['@value'];
    
    return undefined;
  }

  private extractHazards(jsonObject: any): string {
    const hazardStatement = this.extractValue(jsonObject, 'hazardStatement');
    const hazardsValue = this.extractValue(jsonObject, 'hazards');
    
    return [hazardStatement, hazardsValue].filter(v => v).join('\n');
  }

  private extractPrecautions(jsonObject: any): string {
    const precautionaryStatement = this.extractValue(jsonObject, 'precautionaryStatement');
    const precautionsValue = this.extractValue(jsonObject, 'precautions');
    
    return [precautionaryStatement, precautionsValue].filter(v => v).join('\n');
  }

  private extractDescription(jsonObject: any): string {
    return this.extractValue(jsonObject, 'http://www.w3.org/2000/01/rdf-schema#comment') || 
          this.extractValue(jsonObject, 'description') || 
          '';
  }

  private async insertChemical(chemical: Chemical): Promise<void> {
    if (!this.db) return;
    
    await this.db.run(
      `INSERT OR REPLACE INTO chemicals (
        id, name, formula, cas_number, hazards, precautions, first_aid, 
        description, hazard_class, storage_class, risk_phrases, safety_phrases, 
        type, molecular_weight, melting_point, boiling_point, density, solubility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chemical.id, chemical.name, chemical.formula, chemical.casNumber, 
        chemical.hazards, chemical.precautions, chemical.firstAid, 
        chemical.description, chemical.hazardClass, chemical.storageClass, 
        chemical.riskPhrases, chemical.safetyPhrases, chemical.type, 
        chemical.molecularWeight, chemical.meltingPoint, chemical.boilingPoint, 
        chemical.density, chemical.solubility
      ]
    );
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}