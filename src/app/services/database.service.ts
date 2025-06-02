import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

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
    return allData
      .filter(item => item.type === 'chemical')
      .map(item => this.convertToChemical(item))
      .filter(chemical => chemical !== null)
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
    
    for (const item of items) {
      try {
        const dataItem = this.parseDataItemFromJsonLd(item);
        if (dataItem) {
          allItems.push(dataItem);
        }
      } catch (e) {
        console.error('Error parsing item:', e);
      }
    }
    
    return allItems;
  }

  private parseDataItemFromJsonLd(jsonObject: any): AllDataItem | null {
    try {
      const id = this.extractId(jsonObject);
      const name = this.extractName(jsonObject);
      
      if (!name || name === 'Unknown') {
        return null;
      }

      // Determine type based on @type and properties
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
    const name = this.extractName(jsonObject);
    
    // Check for chemical-specific properties
    const hasChemicalProperties = !!(
      jsonObject.molecularFormula || 
      jsonObject.formula || 
      jsonObject.casNumber ||
      jsonObject['id#hasFlammabilityLevel'] ||
      jsonObject['id#hasHealthLevel'] ||
      jsonObject['id#hasInstabilityOrReactivityLevel']
    );

    // Check @type for chemical indicators - improved logic
    if (jsonObject['@type']) {
      const types = Array.isArray(jsonObject['@type']) ? 
                   jsonObject['@type'] : 
                   [jsonObject['@type']];
      
      // Look for NamedIndividual type which indicates chemical entities in your JSON
      const hasNamedIndividualType = types.some((t: string) => 
        t === 'http://www.w3.org/2002/07/owl#NamedIndividual'
      );
      
      if (hasNamedIndividualType) {
        // Check if it has chemical-related properties or looks like a chemical name
        if (hasChemicalProperties || this.looksLikeChemicalName(name)) {
          return true;
        }
        
        // Check if it has the ProductName type in rdf:type property
        if (jsonObject['http://www.w3.org/1999/02/22-rdf-syntax-ns#type']) {
          const rdfTypes = Array.isArray(jsonObject['http://www.w3.org/1999/02/22-rdf-syntax-ns#type']) ?
                          jsonObject['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'] :
                          [jsonObject['http://www.w3.org/1999/02/22-rdf-syntax-ns#type']];
          
          const hasProductNameType = rdfTypes.some((rdfType: any) => 
            rdfType['@id'] === 'id#ProductName'
          );
          
          if (hasProductNameType) {
            return true;
          }
        }
      }
    }

    return hasChemicalProperties;
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

  private looksLikeChemicalName(name: string): boolean {
    const chemicalPatterns = [
      /acid$/i, /\d,\d/, /^[A-Z][a-z]*-\d/, /oxide$/i,
      /chloride$/i, /sulfate$/i, /nitrate$/i, /carbonate$/i,
      /hydroxide$/i, /benzene/i, /methyl/i, /ethyl/i,
      /propyl/i, /^[A-Z][a-z]*ane$/i, /^[A-Z][a-z]*ene$/i,
      /^[A-Z][a-z]*yne$/i, /iodide$/i, /dioxide$/i
    ];
    return chemicalPatterns.some(pattern => pattern.test(name));
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
      'INSERT OR REPLACE INTO all_data (id, name, type, data) VALUES (?, ?, ?, ?)',
      [item.id, item.name, item.type, JSON.stringify(item.data)]
    );
  }

  private async loadAllData(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM all_data ORDER BY name');
      const allItems: AllDataItem[] = (result.values || []).map(row => ({
        ...row,
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
  
  // Find the specific chemical
  const chemical = allData.find(item => 
    item.type === 'chemical' && (item.id === chemicalId || item.id === `id#${chemicalId}`)
  );
  
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
      
      const formula = this.extractValue(jsonObject, 'molecularFormula') || 
                     this.extractValue(jsonObject, 'formula') || 
                     this.extractValue(jsonObject, 'chemicalFormula');
      
      const casNumber = this.extractValue(jsonObject, 'casNumber');
      const hazards = this.extractHazards(jsonObject);
      const precautions = this.extractPrecautions(jsonObject);
      const description = this.extractDescription(jsonObject);
      
      const chemical: Chemical = {
        id,
        name: item.name,
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