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

  // Enhanced blocklist for non-chemical entities
  private readonly NON_CHEMICAL_BLOCKLIST = [
    // Hazard classifications
    'Environmental Hazard', 'Health Hazard', 'Physical Hazard',
    'Aquatic Environment', 'Acute Toxicity', 'Aspiration',
    'Carcinogenicity', 'Eye Damage', 'Skin Corrosion',
    'Respiratory Sensitization', 'Skin Sensitization',
    'Specific Target Organ Toxicity', 'Germ Cell Mutagenicity',
    'Reproductive Toxicity', 'Hazardous to the Ozone Layer',
    
    // Safety and precautionary statements
    'Avoid Contact with', 'Avoid Sources of', 'Keep Away from',
    'Store in', 'Handle with', 'Use only',
    
    // Equipment and procedures
    'Safety Equipment', 'Emergency Procedure', 'First Aid',
    'Disposal Method', 'Storage Requirement',
    
    // Generic terms
    'Combustible Material', 'Flammable Material', 'Oxidizing Agent',
    'Reducing Agent', 'Corrosive Material', 'Toxic Material',
    'Irritant Material', 'Explosive Material',
    
    // Abstract concepts
    'Instability', 'Reactivity', 'Incompatibility', 'Polymerization',
    'Stability', 'Conditions', 'Requirements', 'Precautions',
    'Instructions', 'Guidelines', 'Procedures', 'Methods'
  ];

  constructor(private http: HttpClient) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      console.log('Starting database initialization...');
      this.loadingSubject.next(true);
      
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
      console.log('Chemicals loaded into BehaviorSubject');
      
    } catch (error) {
      console.error('Error initializing database:', error);
      // Try to load directly from JSON as fallback
      await this.loadDirectlyFromJson();
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
      let chemicals: Chemical[] = result.values || [];
      
      // Apply custom sorting: chemicals starting with numbers go to the end
      chemicals = this.sortChemicals(chemicals);
      
      console.log(`Loaded ${chemicals.length} chemicals from database`);
      this.chemicalsSubject.next(chemicals);
    } catch (error) {
      console.error('Error loading chemicals from database:', error);
      this.chemicalsSubject.next([]);
    }
  }

  private async loadDirectlyFromJson(): Promise<void> {
    try {
      console.log('Attempting to load directly from JSON...');
      
      // Try multiple possible paths for the JSON file
      const possiblePaths = [
        '/assets/data/json_database.jsonld',
        'assets/data/json_database.jsonld',
        './assets/data/json_database.jsonld'
      ];

      let jsonData = null;
      for (const path of possiblePaths) {
        try {
          console.log(`Trying to load from: ${path}`);
          jsonData = await this.http.get<any>(path).toPromise();
          console.log(`Successfully loaded from: ${path}`);
          break;
        } catch (e) {
          console.log(`Failed to load from: ${path}`, e);
        }
      }

      if (!jsonData) {
        throw new Error('Could not load JSON data from any path');
      }

      console.log('Raw JSON data:', jsonData);
      
      // Process the JSON-LD data
      let chemicals = this.parseJsonLdData(jsonData);
      console.log(`Parsed ${chemicals.length} chemicals from JSON`);
      
      // Apply custom sorting
      chemicals = this.sortChemicals(chemicals);
      
      // Set chemicals directly without database
      this.chemicalsSubject.next(chemicals);
      
    } catch (error) {
      console.error('Error loading directly from JSON:', error);
      this.chemicalsSubject.next([]);
    }
  }

  // Custom sorting method: chemicals starting with numbers go to the end
  private sortChemicals(chemicals: Chemical[]): Chemical[] {
    return chemicals.sort((a, b) => {
      const aStartsWithNumber = /^[0-9]/.test(a.name);
      const bStartsWithNumber = /^[0-9]/.test(b.name);
      
      // If one starts with number and other doesn't, non-number comes first
      if (aStartsWithNumber && !bStartsWithNumber) return 1;
      if (!aStartsWithNumber && bStartsWithNumber) return -1;
      
      // Both start with numbers or both don't - alphabetical sort
      return a.name.localeCompare(b.name);
    });
  }

  public async getChemicalById(id: number): Promise<Chemical | null> {
    if (!this.db) {
      // If no database, search in current chemicals array
      const currentChemicals = this.chemicalsSubject.value;
      return currentChemicals.find(c => c.id === id) || null;
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
    try {
      this.loadingSubject.next(true);
      
      if (this.db) {
        await this.db.execute('DELETE FROM chemicals');
        await this.loadJsonIntoDatabase();
        await this.loadChemicals();
      } else {
        // If no database connection, reload directly from JSON
        await this.loadDirectlyFromJson();
      }
      
      console.log('Database/Data reloaded successfully');
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
      // Try multiple possible paths for the JSON file
      const possiblePaths = [
        '/assets/data/json_database.jsonld',
        'assets/data/json_database.jsonld',
        './assets/data/json_database.jsonld'
      ];

      let jsonData = null;
      for (const path of possiblePaths) {
        try {
          console.log(`Trying to load JSON from: ${path}`);
          jsonData = await this.http.get<any>(path).toPromise();
          console.log(`Successfully loaded JSON from: ${path}`);
          break;
        } catch (e) {
          console.log(`Failed to load JSON from: ${path}`, e);
        }
      }
      
      if (!jsonData) {
        throw new Error('Failed to load JSON data from any path');
      }

      console.log('Raw JSON data structure:', Object.keys(jsonData));

      // Process the JSON-LD data
      const chemicals = this.parseJsonLdData(jsonData);
      console.log(`Parsed ${chemicals.length} chemicals from JSON`);
      
      if (chemicals.length === 0) {
        console.warn('No chemicals were parsed from the JSON data');
        return;
      }
      
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
      throw error;
    }
  }

  private parseJsonLdData(jsonData: any): Chemical[] {
    const chemicals: Chemical[] = [];
    
    console.log('Parsing JSON-LD data...');
    console.log('Data type:', typeof jsonData);
    console.log('Is array:', Array.isArray(jsonData));
    console.log('Data keys:', Object.keys(jsonData));
    
    // Handle both array and single object formats
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
    
    console.log(`Processing ${items.length} items`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        console.log(`Processing item ${i}:`, Object.keys(item));
        
        if (!this.isChemicalObject(item)) {
          console.log(`Item ${i} is not a chemical object`);
          continue;
        }
        
        const chemical = this.parseChemicalFromJsonLd(item);
        if (chemical) {
          chemicals.push(chemical);
          console.log(`Successfully parsed chemical: ${chemical.name}`);
        } else {
          console.log(`Failed to parse chemical from item ${i}`);
        }
      } catch (e) {
        console.error(`Error parsing item ${i}:`, e);
      }
    }
    
    console.log(`Total chemicals parsed: ${chemicals.length}`);
    return chemicals;
  }

  private isChemicalObject(jsonObject: any): boolean {
    // First, check if this object should be blocked based on its properties
    if (this.shouldBlockObject(jsonObject)) {
      return false;
    }

    // Extract potential name to check against blocklist
    const name = this.extractName(jsonObject);
    if (this.isBlockedName(name)) {
      return false;
    }

    // Check for @type restrictions - be more specific about what we accept
    if (jsonObject['@type']) {
      const types = Array.isArray(jsonObject['@type']) ? 
                   jsonObject['@type'] : 
                   [jsonObject['@type']];
      
      // Only accept specific chemical-related types
      const acceptedTypes = [
        'http://www.w3.org/2002/07/owl#NamedIndividual',
        'NamedIndividual',
        'Chemical',
        'ChemicalSubstance',
        'Compound',
        'Element',
        'Substance',
        'Material',
        'Reagent'
      ];
      
      const hasAcceptedType = types.some((t: string) => {
        // Check for ProductName type (from your JSON-LD)
        if (t.includes('ProductName')) return true;
        
        return acceptedTypes.some(acceptedType => 
          t.toLowerCase().includes(acceptedType.toLowerCase())
        );
      });
      
      if (!hasAcceptedType) {
        return false;
      }
    }

    // Additional checks for valid chemical identifiers
    const hasChemicalIdentifiers = !!(
      jsonObject.molecularFormula || 
      jsonObject.formula || 
      jsonObject.casNumber ||
      jsonObject['id#hasFlammabilityLevel'] ||
      jsonObject['id#hasHealthLevel'] ||
      jsonObject['id#hasInstabilityOrReactivityLevel']
    );

    // Must have a valid name and preferably some chemical identifiers
    return !!(name && name !== 'Unknown Chemical' && 
             (hasChemicalIdentifiers || this.looksLikeChemicalName(name)));
  }

  private shouldBlockObject(jsonObject: any): boolean {
    // Check for restriction objects (OWL restrictions)
    if (jsonObject['@type'] && 
        Array.isArray(jsonObject['@type']) && 
        jsonObject['@type'].includes('http://www.w3.org/2002/07/owl#Restriction')) {
      return true;
    }

    // Check for hazard-related properties that indicate this is not a chemical
    const hazardProperties = [
      'isEnvironmentalHazardsOf',
      'isFirstAidEyeOf',
      'isFirstAidIngestionOf',
      'isFirstAidInhalationOf',
      'isConditionsOfInstabilityOf'
    ];

    const hasHazardProperties = hazardProperties.some(prop => 
      jsonObject[`id#${prop}`] || jsonObject[prop]
    );

    return hasHazardProperties;
  }

  private isBlockedName(name: string): boolean {
    if (!name || name === 'Unknown Chemical') return true;

    // Check against our comprehensive blocklist
    return this.NON_CHEMICAL_BLOCKLIST.some(blockedTerm => 
      name.toLowerCase().includes(blockedTerm.toLowerCase())
    );
  }

  private looksLikeChemicalName(name: string): boolean {
    // Patterns that suggest a chemical name
    const chemicalPatterns = [
      /acid$/i,                    // ends with "acid"
      /\d,\d/,                    // contains numbers with comma (like 2,4-...)
      /^[A-Z][a-z]*-\d/,          // starts with letter, has dash and number
      /oxide$/i,                  // ends with "oxide"
      /chloride$/i,               // ends with "chloride"
      /sulfate$/i,                // ends with "sulfate"
      /nitrate$/i,                // ends with "nitrate"
      /carbonate$/i,              // ends with "carbonate"
      /hydroxide$/i,              // ends with "hydroxide"
      /benzene/i,                 // contains "benzene"
      /methyl/i,                  // contains "methyl"
      /ethyl/i,                   // contains "ethyl"
      /propyl/i,                  // contains "propyl"
      /^[A-Z][a-z]*ane$/i,        // alkane naming pattern
      /^[A-Z][a-z]*ene$/i,        // alkene naming pattern
      /^[A-Z][a-z]*yne$/i,        // alkyne naming pattern
    ];

    return chemicalPatterns.some(pattern => pattern.test(name));
  }

  private parseChemicalFromJsonLd(jsonObject: any): Chemical | null {
    try {
      // Generate ID from @id or name
      const idString = jsonObject['@id'] || jsonObject.id || jsonObject.name || Math.random().toString();
      const id = Math.abs(this.hashCode(idString.toString()));
      
      // Extract name from various possible locations
      const name = this.extractName(jsonObject);
      if (!name || name === 'Unknown Chemical' || this.isBlockedName(name)) {
        console.log('Skipping chemical with no valid name or blocked name:', name);
        return null;
      }
      
      // Extract other properties
      const formula = this.extractValue(jsonObject, 'molecularFormula') || 
                     this.extractValue(jsonObject, 'formula') || 
                     this.extractValue(jsonObject, 'chemicalFormula');
      
      const casNumber = this.extractValue(jsonObject, 'casNumber');
      const hazards = this.extractHazards(jsonObject);
      const precautions = this.extractPrecautions(jsonObject);
      const description = this.extractDescription(jsonObject);
      
      const chemical: Chemical = {
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
      
      return chemical;
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
          this.extractValue(jsonObject, 'title') ||
          this.extractValue(jsonObject, 'label');
    
    if (name) return name;
    
    // Try to extract from @id as last resort
    if (jsonObject['@id']) {
      const id = jsonObject['@id'];
      if (id.startsWith('id#')) {
        return id.substring(3)
          .replace(/\.\./g, ',')  // Convert .. to comma for chemical names like 2,4,6-
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