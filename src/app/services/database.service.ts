import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface Chemical {
  id: number;
  name: string;
  aliases: string[];
  canonicalId: string; // The main chemical ID this represents
  hazards?: string;
  precautions?: string;
  firstAid?: string;
  description?: string;
  hazardClass?: string;
}

export interface EmergencyClass {
  id: string;
  name: string;
  parentClass?: string;
  subClasses: string[];
  description?: string;
  children?: EmergencyClass[];
}

export interface AllDataItem {
  id: string;
  name: string;
  type: string;
  canonicalId?: string; // For tracking which chemical this is an alias of
  aliases?: string[]; // List of all names for this chemical
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private allDataSubject = new BehaviorSubject<AllDataItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private chemicalAliasMap = new Map<string, string>(); // Maps alias ID to canonical ID
  private canonicalChemicals = new Map<string, AllDataItem>(); // Maps canonical ID to main chemical data
  
  public allData$ = this.allDataSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  
  // Add chemicals observable that the component expects
  public chemicals$ = this.allData$.pipe(
    map(allData => this.extractChemicalsFromAllData(allData))
  );

  constructor(private http: HttpClient) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private extractChemicalsFromAllData(allData: AllDataItem[]): Chemical[] {
    // Only return canonical chemicals (not aliases)
    return allData
      .filter(item => item.type === 'chemical' && !item.canonicalId) // Only canonical chemicals
      .map(item => this.convertToChemical(item))
      .filter((chemical): chemical is Chemical => chemical !== null)
      .sort((a, b) => {
        const aStartsWithNumber = /^[0-9]/.test(a.name);
        const bStartsWithNumber = /^[0-9]/.test(b.name);
        
        if (aStartsWithNumber && !bStartsWithNumber) return 1;
        if (!aStartsWithNumber && bStartsWithNumber) return -1;
        
        return a.name.localeCompare(b.name);
      });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      this.db = await this.sqlite.createConnection(
        'labsafe_all_data',
        false,
        'no-encryption',
        1,
        false
      );
      
      await this.db.open();
      await this.createTables();
      await this.loadJsonIntoDatabase();
      await this.loadAllData();
      
    } catch (error) {
      console.error('Error initializing database:', error);
      await this.loadDirectlyFromJson();
    } finally {
      this.loadingSubject.next(false);
    }
  }

  public getCurrentAllData(): AllDataItem[] {
    return this.allDataSubject.value;
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createAllDataTable = `
      CREATE TABLE IF NOT EXISTS all_data (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        canonical_id TEXT,
        aliases TEXT,
        data TEXT NOT NULL
      );
    `;

    await this.db.execute(createAllDataTable);
  }

  private async loadDirectlyFromJson(): Promise<void> {
    try {
      console.log('Attempting to load directly from JSON...');
      
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

      const allItems = this.parseAllJsonLdData(jsonData);
      this.allDataSubject.next(allItems);
      
    } catch (error) {
      console.error('Error loading directly from JSON:', error);
      this.allDataSubject.next([]);
    }
  }

  private async loadJsonIntoDatabase(): Promise<void> {
    if (!this.db) return;

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
          continue;
        }
      }
      
      if (!jsonData) {
        throw new Error('Failed to load JSON data from any path');
      }

      const allItems = this.parseAllJsonLdData(jsonData);
      
      await this.db.execute('BEGIN TRANSACTION');
      
      for (const item of allItems) {
        await this.insertDataItem(item);
      }
      
      await this.db.execute('COMMIT');
      
    } catch (error) {
      console.error('Error loading data:', error);
      if (this.db) {
        await this.db.execute('ROLLBACK');
      }
      throw error;
    }
  }

  private parseAllJsonLdData(jsonData: any): AllDataItem[] {
    const allItems: AllDataItem[] = [];
    this.chemicalAliasMap.clear();
    this.canonicalChemicals.clear();
    
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
    
    // First pass: identify all chemicals and their aliases
    const chemicalItems = items.filter((item: any) => this.isChemicalObject(item));
    
    // Build alias map
    for (const item of chemicalItems) {
      const id = this.extractId(item);
      const sameAsRefs = this.extractSameAsReferences(item);
      
      if (sameAsRefs.length > 0) {
        // This is an alias, map it to its canonical form
        for (const canonicalRef of sameAsRefs) {
          const canonicalId = canonicalRef.startsWith('id#') ? canonicalRef.substring(3) : canonicalRef;
          this.chemicalAliasMap.set(id, canonicalId);
        }
      }
    }
    
    // Second pass: process all items and group aliases
    const processedCanonicalIds = new Set<string>();
    
    for (const item of items) {
      try {
        const dataItem = this.parseDataItemFromJsonLd(item);
        if (dataItem && dataItem.type === 'chemical') {
          const canonicalId = this.chemicalAliasMap.get(dataItem.id) || dataItem.id;
          
          if (!processedCanonicalIds.has(canonicalId)) {
            // This is either a canonical chemical or the first time we see this canonical ID
            const canonicalItem = this.createCanonicalChemicalItem(canonicalId, chemicalItems);
            if (canonicalItem) {
              allItems.push(canonicalItem);
              this.canonicalChemicals.set(canonicalId, canonicalItem);
              processedCanonicalIds.add(canonicalId);
            }
          }
        } else if (dataItem && dataItem.type !== 'chemical') {
          // Non-chemical items are added as-is
          allItems.push(dataItem);
        }
      } catch (e) {
        console.error('Error parsing item:', e);
      }
    }
    
    return allItems;
  }

  private createCanonicalChemicalItem(canonicalId: string, chemicalItems: any[]): AllDataItem | null {
    // Find the main chemical (the one that others reference as sameAs)
    let mainChemical = chemicalItems.find((item: any) => {
      const id = this.extractId(item);
      return id === canonicalId;
    });

    // If we can't find the main chemical, use the first alias we find
    if (!mainChemical) {
      mainChemical = chemicalItems.find((item: any) => {
        const id = this.extractId(item);
        return this.chemicalAliasMap.get(id) === canonicalId;
      });
    }

    if (!mainChemical) {
      return null;
    }

    // Collect all aliases for this canonical chemical
    const aliases: string[] = [];
    const aliasData: any[] = [];
    
    for (const item of chemicalItems) {
      const id = this.extractId(item);
      const mappedCanonicalId = this.chemicalAliasMap.get(id) || id;
      
      if (mappedCanonicalId === canonicalId) {
        const name = this.extractName(item);
        if (name && name !== 'Unknown') {
          aliases.push(name);
          aliasData.push(item);
        }
      }
    }

    // Use the main chemical's name, or the first alias if main chemical has no good name
    let primaryName = this.extractName(mainChemical);
    if (!primaryName || primaryName === 'Unknown') {
      primaryName = aliases.find(name => name !== 'Unknown') || 'Unknown';
    }

    // Merge data from all aliases to get the most complete information
    const mergedData = this.mergeChemicalData(mainChemical, aliasData);

    return {
      id: canonicalId,
      name: primaryName,
      type: 'chemical',
      aliases: [...new Set(aliases)], // Remove duplicates
      data: mergedData
    };
  }

  private mergeChemicalData(mainChemical: any, aliasData: any[]): any {
    const merged = { ...mainChemical };
    
    // Merge properties from all aliases, preferring non-empty values
    for (const alias of aliasData) {
      for (const [key, value] of Object.entries(alias)) {
        if (value && (!merged[key] || (Array.isArray(value) && value.length > 0))) {
          if (Array.isArray(merged[key]) && Array.isArray(value)) {
            // Merge arrays and remove duplicates
            merged[key] = [...new Set([...merged[key], ...value])];
          } else if (!merged[key]) {
            merged[key] = value;
          }
        }
      }
    }
    
    return merged;
  }

  private extractSameAsReferences(item: any): string[] {
    const sameAsRefs: string[] = [];
    const sameAsProp = item['http://www.w3.org/2002/07/owl#sameAs'];
    
    if (sameAsProp) {
      if (Array.isArray(sameAsProp)) {
        for (const ref of sameAsProp) {
          if (ref['@id']) {
            sameAsRefs.push(ref['@id']);
          }
        }
      } else if (sameAsProp['@id']) {
        sameAsRefs.push(sameAsProp['@id']);
      }
    }
    
    return sameAsRefs;
  }

  private parseDataItemFromJsonLd(jsonObject: any): AllDataItem | null {
    try {
      const id = this.extractId(jsonObject);
      const name = this.extractName(jsonObject);
      
      if (!name || name === 'Unknown') {
        return null;
      }

      // Determine type - simplified since JSON should contain all chemicals
      let type = 'unknown';
      if (this.isChemicalObject(jsonObject)) {
        type = 'chemical';
      } else if (this.isClass(jsonObject)) {
        type = 'class';
      } else if (this.isStepOrProcedure(jsonObject)) {
        type = 'step';
      }

      return {
        id,
        name,
        type,
        data: jsonObject
      };
    } catch (e) {
      console.error('Error parsing data item:', e);
      return null;
    }
  }

  private isChemicalObject(jsonObject: any): boolean {
    // Simplified: assume all NamedIndividual items are chemicals unless they're clearly classes
    if (jsonObject['@type']) {
      const types = Array.isArray(jsonObject['@type']) ? 
                   jsonObject['@type'] : 
                   [jsonObject['@type']];
      
      const hasNamedIndividualType = types.some((t: string) => 
        t === 'http://www.w3.org/2002/07/owl#NamedIndividual'
      );
      
      if (hasNamedIndividualType) {
        // Check if it's not a class
        const isClass = types.some((t: string) => 
          t === 'http://www.w3.org/2002/07/owl#Class' ||
          t.includes('Class')
        );
        
        return !isClass;
      }
    }

    return false;
  }

  private isClass(item: any): boolean {
    if (!item['@type']) return false;
    
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    return types.some((type: string) => 
      type === 'http://www.w3.org/2002/07/owl#Class' ||
      type.includes('Class')
    );
  }

  private isStepOrProcedure(item: any): boolean {
    const name = this.extractName(item);
    
    // Look for step/procedure indicators
    const stepKeywords = [
      'step', 'procedure', 'instruction', 'emergency', 'safety',
      'first aid', 'hazard', 'precaution', 'warning', 'caution'
    ];
    
    return stepKeywords.some(keyword => 
      name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private extractId(item: any): string {
    if (item['@id']) {
      return item['@id'].startsWith('id#') ? item['@id'].substring(3) : item['@id'];
    }
    return Math.random().toString(36).substring(7);
  }

  private extractName(jsonObject: any): string {
    let name = this.extractValue(jsonObject, 'http://www.w3.org/2000/01/rdf-schema#label');
    if (name) return name;
    
    name = this.extractValue(jsonObject, 'name') || 
          this.extractValue(jsonObject, 'http://schema.org/name') || 
          this.extractValue(jsonObject, 'title') ||
          this.extractValue(jsonObject, 'label');
    
    if (name) return name;
    
    if (jsonObject['@id']) {
      const id = jsonObject['@id'];
      if (id.startsWith('id#')) {
        return id.substring(3)
          .replace(/\.\./g, ',')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/([0-9])([A-Z])/g, '$1 $2')
          .trim();
      }
    }
    
    return 'Unknown';
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

  private async insertDataItem(item: AllDataItem): Promise<void> {
    if (!this.db) return;
    
    await this.db.run(
      'INSERT OR REPLACE INTO all_data (id, name, type, canonical_id, aliases, data) VALUES (?, ?, ?, ?, ?, ?)',
      [
        item.id, 
        item.name, 
        item.type, 
        item.canonicalId || null,
        JSON.stringify(item.aliases || []),
        JSON.stringify(item.data)
      ]
    );
  }

  private async loadAllData(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM all_data ORDER BY name');
      const allItems: AllDataItem[] = (result.values || []).map(row => ({
        ...row,
        canonicalId: row.canonical_id,
        aliases: JSON.parse(row.aliases || '[]'),
        data: JSON.parse(row.data)
      }));
      
      this.allDataSubject.next(allItems);
    } catch (error) {
      console.error('Error loading all data from database:', error);
      this.allDataSubject.next([]);
    }
  }

  // Public methods for filtering data
  public getChemicals(): Chemical[] {
    const allData = this.allDataSubject.value;
    return this.extractChemicalsFromAllData(allData);
  }

  public getEmergencyStepsForChemical(chemicalId: string): string[] {
    const allData = this.allDataSubject.value;
    const steps: string[] = [];
    
    // Find the chemical by ID or by checking if it's an alias
    let chemical = allData.find(item => 
      item.type === 'chemical' && (item.id === chemicalId || item.id === `id#${chemicalId}`)
    );
    
    // If not found, check if this ID is an alias
    if (!chemical) {
      const canonicalId = this.chemicalAliasMap.get(chemicalId);
      if (canonicalId) {
        chemical = allData.find(item => 
          item.type === 'chemical' && item.id === canonicalId
        );
      }
    }
    
    if (chemical && chemical.data) {
      const emergencySteps = this.extractEmergencyStepsFromChemical(chemical.data);
      steps.push(...emergencySteps);
    }
    
    // If no specific steps found, get general emergency steps
    if (steps.length === 0) {
      return this.getAllEmergencySteps();
    }
    
    return steps;
  }

  public getAllEmergencySteps(): string[] {
    const allData = this.allDataSubject.value;
    const steps: string[] = [];
    
    // Get emergency steps from all chemicals
    const chemicals = allData.filter(item => item.type === 'chemical');
    
    for (const chemical of chemicals) {
      const emergencySteps = this.extractEmergencyStepsFromChemical(chemical.data);
      steps.push(...emergencySteps);
    }
    
    // Remove duplicates and return
    return [...new Set(steps)];
  }

  // Method to find chemical by name (including aliases)
  public findChemicalByName(name: string): Chemical | null {
    const chemicals = this.getChemicals();
    
    // First try exact match on main name
    let chemical = chemicals.find(c => c.name.toLowerCase() === name.toLowerCase());
    
    // If not found, search in aliases
    if (!chemical) {
      chemical = chemicals.find(c => 
        c.aliases.some(alias => alias.toLowerCase() === name.toLowerCase())
      );
    }
    
    return chemical || null;
  }

  private extractEmergencyStepsFromChemical(chemicalData: any): string[] {
    const steps: string[] = [];
    
    // Define emergency-related properties to look for
    const emergencyProperties = [
      'id#hasAccidentalGeneral',
      'id#hasFirstAidGeneral',
      'id#hasFirstAidEye',
      'id#hasFirstAidIngestion',
      'id#hasFirstAidInhalation',
      'id#hasFirstAidSeriousInhalation',
      'id#hasFirstAidSeriousSkin',
      'id#hasFirstAidSkin',
      'id#hasLargeSpill',
      'id#hasSmallSpill',
      'id#hasLargeFireFighting',
      'id#hasConditionsOfInstability',
      'id#hasHealthHazards',
      'id#hasPhysicalHazards',
      'id#hasIncompatibilityIssuesWith',
      'id#hasReactivityWith',
      'id#hasStabilityAtNormalConditions',
      'id#hasPolymerization'
    ];
    
    // Extract steps from each emergency property
    for (const property of emergencyProperties) {
      if (chemicalData[property]) {
        const propertySteps = this.extractStepsFromProperty(chemicalData[property], property);
        steps.push(...propertySteps);
      }
    }
    
    return steps;
  }

  private extractStepsFromProperty(propertyValue: any, propertyName: string): string[] {
    const steps: string[] = [];
    
    // Get a readable name for the emergency category
    const categoryName = this.getEmergencyCategoryName(propertyName);
    
    if (Array.isArray(propertyValue)) {
      const items = propertyValue.map(item => {
        if (typeof item === 'object' && item['@id']) {
          return this.formatEmergencyStepName(item['@id']);
        }
        return item;
      }).filter(item => item);
      
      if (items.length > 0) {
        steps.push(`${categoryName}: ${items.join(', ')}`);
      }
    } else if (typeof propertyValue === 'object' && propertyValue['@id']) {
      const stepName = this.formatEmergencyStepName(propertyValue['@id']);
      if (stepName) {
        steps.push(`${categoryName}: ${stepName}`);
      }
    } else if (typeof propertyValue === 'string') {
      steps.push(`${categoryName}: ${propertyValue}`);
    }
    
    return steps;
  }

  private getEmergencyCategoryName(propertyName: string): string {
    const categoryMap: { [key: string]: string } = {
      'id#hasAccidentalGeneral': 'Accidental Release',
      'id#hasFirstAidGeneral': 'General First Aid',
      'id#hasFirstAidEye': 'Eye Contact First Aid',
      'id#hasFirstAidIngestion': 'Ingestion First Aid',
      'id#hasFirstAidInhalation': 'Inhalation First Aid',
      'id#hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'id#hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'id#hasFirstAidSkin': 'Skin Contact First Aid',
      'id#hasLargeSpill': 'Large Spill Procedures',
      'id#hasSmallSpill': 'Small Spill Procedures',
      'id#hasLargeFireFighting': 'Fire Fighting Procedures',
      'id#hasConditionsOfInstability': 'Instability Conditions',
      'id#hasHealthHazards': 'Health Hazards',
      'id#hasPhysicalHazards': 'Physical Hazards',
      'id#hasIncompatibilityIssuesWith': 'Incompatible Materials',
      'id#hasReactivityWith': 'Reactive Materials',
      'id#hasStabilityAtNormalConditions': 'Stability Information',
      'id#hasPolymerization': 'Polymerization Information'
    };
    
    return categoryMap[propertyName] || propertyName.replace('id#has', '').replace(/([A-Z])/g, ' $1').trim();
  }

  private formatEmergencyStepName(idValue: string): string {
    if (!idValue) return '';
    
    // Remove 'id#' prefix if present
    let name = idValue.startsWith('id#') ? idValue.substring(3) : idValue;
    
    // Convert camelCase to readable format
    name = name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .replace(/\.\./g, ', ')
      .trim();
    
    return name;
  }

  private convertToChemical(item: AllDataItem): Chemical | null {
    try {
      const jsonObject = item.data;
      const idString = item.id;
      const id = Math.abs(this.hashCode(idString.toString()));
      
      const hazards = this.extractHazards(jsonObject);
      const precautions = this.extractPrecautions(jsonObject);
      const description = this.extractDescription(jsonObject);
      
      const chemical: Chemical = {
        id,
        name: item.name,
        aliases: item.aliases || [],
        canonicalId: item.id,
        hazards,
        precautions,
        firstAid: this.extractValue(jsonObject, 'firstAid'),
        description,
        hazardClass: this.extractValue(jsonObject, 'hazardClass')
      };
      
      return chemical;
    } catch (e) {
      console.error('Error converting to chemical:', e);
      return null;
    }
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

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  public async reloadDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      if (this.db) {
        await this.db.execute('DELETE FROM all_data');
        await this.loadJsonIntoDatabase();
        await this.loadAllData();
      } else {
        await this.loadDirectlyFromJson();
      }
      
    } catch (error) {
      console.error('Error reloading database:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }
}