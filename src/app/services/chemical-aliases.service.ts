import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface ChemicalAlias {
  id: string;
  mainName: string;
  aliasName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChemicalAliasesService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private aliasesSubject = new BehaviorSubject<ChemicalAlias[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  public aliases$ = this.aliasesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  private hardcodedAliases: { [key: string]: string[] } = {
    'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'Acetone and Nitric Acid': [],
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
    'Acetic Acid': ['Glacial Acetic Acid'],
    'Ethyl Acetate': ['AceticAcid..EthylEster', 'Acetic Acid | Ethyl Ester', 'Acetoxyethane', 'Ethyl Ethanoate'],
    'Aluminum': ['Aluminum Powder'],
    'Aluminum and Diethyl Ether': [],
    'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
    'Ammonia': [],
    'Acetylene and Ammonia': [],
    'Ammonium Hydroxide': ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water'],
    'Ammonium Hydroxide and Silver Oxide': [],
    'Ammonium Chloride': ['Ammonium Chloratum', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac'],
    'Ammonium Nitrate': ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter', 'Ammonium Salt and Nitric Acid'],
    'Ammonium Sulfate': ['Diammonium Salt with Sulfuric Acid'],
    'Antimony': ['Antimony Powder', 'Antimony Salt'],
    'Arsenic': [],
    'Arsenic Pentafluoride and Potassium Methoxide in Trichlorotrifluoroethane': [],
    'Barium Chloride': ['Barium Chloride Anhydrous', 'Barium Dichloride Anhydrous'],
    'Barium Chloride Dihydrate': ['Barium Dichloride Dihydrate'],
    'Benzene': ['Benzine', 'Benzol'],
    'Beryllium': [],
    'Beryllium Dihydride': [],
    'Bromine': [],
    'Bromine Pentafluoride': [],
    'Bromine Trichloride': [],
    'Carbon Tetrachloride': [],
    'Chlorine Trifluoride and Carbon': [],
    'Chlorine': [],
    'Chlorine Dioxide': [],
    'Chlorine Trifluoride': [],
    'Chloroform': ['Trichloromethane'],
    'Chloroform and Sodium Methoxide': [],
    'Chloroform-methanol': [],
    'Citric Acid': ['2-Hydroxy-1,2,3-propanetricarboxylic Acid'],
    'Copper Sulfate Pentahydrate': ['Blue Vitriol', 'Copper (II) Sulfate Pentahydrate'],
    'Copper Chloride': ['Cupric Chloride Dihydrate', 'Copper Chloride Dihydrate', 'Coppertrace'],
    'Copper Oxide': ['Cupric Oxide', 'Copper (II) Oxide'],
    'Cuprous Chloride': [],
    '3,5-Dinitrosalicylic Acid': ['2-hydroxy-3,5-dinitrobenzoic Acid'],
    'Ethanol': ['Absolute Ethanol', 'Ethyl Alcohol', 'Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol', 'Carbinol'],
    'Ethyl Alcohol and Hydrogen Peroxide': ['Ethyl Alchohol and Hydrogen Peroxide'],
    'Methyl Alcohol': [],
    'Formaldehyde': ['Formalin', 'Formaldehyde (37% Solution)'],
    'Formic Acid': ['Formic Acid (85%)', 'FormicAcid, 85Percent, F.C.C'],
    'Glucose': ['D-Glucose', 'Dextrose (Anhydrous)', 'Dextrose'],
    'Glycerin': ['1,2,3-Propanetriol'],
    'Hydrogen Peroxide': ['Hydrogen Peroxide (30%)'],
    'Alcohols and Hydrogen Peroxide': [],
    '1-Phenyl-2-Methylpropyl Alcohol and Hydrogen Peroxide': ['Dimenthylbenzylcarbinol and Hydrogen Peroxide'],
    'Hydrogen Peroxide and Sulfuric Acid': [],
    'Iodine': [],
    'Iodine and Methanol and Mercuric Oxide': ['Ethanol and Methanol and Mercuric Oxide'],
    'Iodine Bromide': [],
    'Iodine Heptafluroide': [],
    'Iron': ['Iron Powder'],
    'Iron Oxide': [],
    'Ferrous Sulfate': ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate'],
    'Ferrous Ammonium Sulfate': ['Ammonium Iron (II) Sulfate, Hexahydrate', 'Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate'],
    'Lactose': ['beta-d-galactopyranosyl-o-4D-glucopyrannose', 'Lactose (Anhydrous)'],
    'Lauric Acid': ['ABL', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid', 'Neo-fat12', 'Neo-fat12-43', 'Vulvic Acid', 'n-Dodecanoic Acid'],
    'Magnesium Oxide': ['Calcined Brucite', 'Magnesia', 'Magnesium Oxide Heavy Powder'],
    'Magnesium Sulfate': ['Magnesium Sulfate (Anhydrous)'],
    'Melamine': ['2,4,6-Triamino-s-Triazine'],
    'Mercuric Chloride': ['Bichloride of Mercury', 'Calochlor'],
    'Naphthalene': [],
    '1,5-Dinitronaphthalene And Sulfur': [],
    'Nitric Acid': [],
    'Indane and Nitric Acid': [],
    'Oxalic Acid': ['Oxalic Acid (Anhydrous)', 'Ethanedionic Acid', 'Ethanedoic Acid'],
    'Phosphorus Pentoxide': ['Di-phosphorus Pentoxide'],
    'Polyethylene Glycol 400': ['PEG400', 'PEG-8', 'Poly(oxy-1,2-ethanediyl).alpha.-hydro-.omega.-hydroxy-'],
    'Polysorbate 80': ['Polyethylene Oxide Sorbitan Mono-oleate', 'Polyoxyethylene 20 Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Oleate', 'Sorbitan Mono-9-otadecenoate Poly(Oxy-1,2-ethanediyl) Derivatives', 'Sorethytanop20cpMonooleate', 'TWEEN80'],
    'Potassium Dichromate': ['Bichromate of Potash'],
    'Potassium Phthalate': ['1,2-Benzenedicarboxylic Acid Monopotassium Salt', 'Potassium Bitphthlate', 'Pthalic Acid Monopotassium Salt', 'Hydrogen Potassium Pthalate'],
    'Potassium Phosphate Monobasic': ['Monopotassium Phosphate', 'PhosphoricAcid,MonopotassiumSalt', 'Potassium Dihydrogen Phospate'],
    'Potassium Phosphate Dibasic': ['Dipotassium Phosphate'],
    'Pyrogallic Acid': ['1,2,3-Benzenetriol', '1,2,3-Trihydroxybenzene'],
    'Salicylic Acid': ['2-Hydroxybenzoic Acid'],
    'Sodium Azide': ['Hydrazoic Acid, Sodium Salt', 'Smite'],
    'Sodium Bisulfite': ['Hydrogen Sulfite Sodium', 'Monosodium Salt Sulfurous Acid', 'Monosodium Sulfite', 'Sodium Acid Sulfite', 'Sodium Hydrogen Sulfite', 'Sodium Sulhydrate'],
    'Sodium Hydroxide': ['Caustic Soda'],
    'Sodium Lauryl Sulfate': ['Sodium Dodecyl Sulfate', 'Sulfuric Acid, Monododecyl Ester, Sodium Salt'],
    'Sodium Phosphate Dibasic': ['Dibasic Sodium Phosphate', 'Disodium Hydrogen Phosphate', 'Disodium Monohydrogen Phosphate', 'Disodium Orthophosphate', 'Disodium Phosphoric Acid', 'Phosphoric Acid, Disodium Salt', 'Soda Phosphate', 'Sodium Hydrogen Phosphate', 'Sodium Monohydrogen Phosphate'],
    'Sodium Thiosulfate': ['Ametox, Antichlor'],
    'Sodium Thiosulfate Pentahydrate': [],
    'Sulfuric Acid': ['Oil of Vitriol'],
    'Triethanolamine': ['Ethanol,2,2,2-nitrilotris', 'Tri(2-hydroxyethyl)amine', 'Trolamine'],
    'Tris': ['2-Amino-2-(hydroxymethyl)propane-1,3-diol Hydrochloride', 'Tris(hydroxymethyl)methylamine'],
    'Vinyl Acetate': ['Vinyl Acetate Monomer'],
    'Zinc Acetate': ['Zinc Diacetate, Dihydrate'],
    'Zinc': ['Zinc Metal', 'Zin', 'Zinc Metal Sheets', 'Zinc Metal Shot', 'Zinc Metal Strips'],
    'Acetyl Chloride': [],
    'Acetylene': [],
    'Acrylic Acid': [],
    'Allyl Chloride': ['Ally Chloride'],
    'Anilinobenzene': ['Diphenylamine'],
    'Benzalkonium Chloride': [],
    'Buffer Solution (pH 4.00)': [],
    'Carbon Dioxide': [],
    'Chlorosulfonic Acid': [],
    'Chromic Acid': [],
    'Chromic Oxide': [],
    'Chromium Trioxide': [],
    'Chromyl Chloride': [],
    'Cobalt Oxide': ['Cobal Oxide'],
    'Cumene': [],
    'Cyanuric Chloride': [],
    'Cyclopentadiene': [],
    'Diborane': [],
    'Dibromoethane': [],
    'Dichloroethyl Ether': [],
    'Dichloromethane': [],
    'Dihydrogen Monoxide': ['Water', 'Dihydrogen Oxide'],
    'Diisobutylene': [],
    'Dimanganese Heptoxide': [],
    'Dimethyl Sulfate': [],
    'Dioxane': [],
    'Disilane': [],
    'Disulfur Dichloride': [],
    'Ethylene Diamine': ['Ethlenediamine'],
    'Ethylene Glycol': [],
    'Ethylene Glycol Monoethyl Ether Acetate': [],
    'Ethylene Imine': ['Ethyleneimine', 'Ehtyleneimine'],
    'Ethylene Oxide': ['Ehtylene Oxide', 'Ehtylene Oxide and Heat'],
    'Ammonium Thiosulfate': [],
    'Water': ['Dihydrogen Monoxide', 'Dihydrogen Oxide']
  };

  constructor(private http: HttpClient) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      this.db = await this.sqlite.createConnection(
        'chemical_aliases',
        false,
        'no-encryption',
        1,
        false
      );
      
      await this.db.open();
      await this.createTables();
      await this.loadInitialData();
      
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const createAliasesTable = `
      CREATE TABLE IF NOT EXISTS chemical_aliases (
        id TEXT PRIMARY KEY NOT NULL,
        main_name TEXT NOT NULL,
        alias_name TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'json'
      );
    `;

    await this.db.execute(createAliasesTable);
    
    // Create index for better search performance
    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_main_name ON chemical_aliases(main_name);
    `);
    await this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_alias_name ON chemical_aliases(alias_name);
    `);
  }

  private async loadInitialData(): Promise<void> {
    if (!this.db) return;

    const result = await this.db.query('SELECT COUNT(*) as count FROM chemical_aliases');
    const count = result.values?.[0]?.count || 0;

    if (count === 0) {
      await this.loadHardcodedAliases();
      await this.loadAliasesFromJson();
    } else {

      const hardcodedCount = await this.db.query(
        'SELECT COUNT(*) as count FROM chemical_aliases WHERE source = ?', 
        ['hardcoded']
      );
      const hardcodedExists = hardcodedCount.values?.[0]?.count || 0;
      
      if (hardcodedExists === 0) {

        await this.loadHardcodedAliases();
      }
      
      // Load existing data from database
      await this.loadAllAliases();
    }
  }

  private async loadHardcodedAliases(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('Loading hardcoded chemical aliases...');
      await this.db.execute('BEGIN TRANSACTION');

      for (const [mainName, aliases] of Object.entries(this.hardcodedAliases)) {
        for (const aliasName of aliases) {
          if (aliasName && aliasName !== mainName) {
            const id = `hardcoded_${mainName}_${aliasName}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            const existingResult = await this.db.query(
              'SELECT id FROM chemical_aliases WHERE main_name = ? AND alias_name = ?',
              [mainName, aliasName]
            );
            
            if (!existingResult.values?.length) {
              await this.db.run(
                'INSERT INTO chemical_aliases (id, main_name, alias_name, source) VALUES (?, ?, ?, ?)',
                [id, mainName, aliasName, 'hardcoded']
              );
            }
          }
        }
      }

      await this.db.execute('COMMIT');
      console.log('Hardcoded aliases loaded successfully');
      
    } catch (error) {
      console.error('Error loading hardcoded aliases:', error);
      if (this.db) {
        await this.db.execute('ROLLBACK');
      }
    }
  }

  private async loadAliasesFromJson(): Promise<void> {
    try {
      console.log('Attempting to load aliases from JSON...');
      const possiblePaths = [
        '/assets/data/json_database.jsonld',
        'assets/data/json_database.jsonld',
        './assets/data/json_database.jsonld'
      ];

      let jsonData = null;
      for (const path of possiblePaths) {
        try {
          jsonData = await this.http.get<any>(path).toPromise();
          console.log(`Successfully loaded JSON from: ${path}`);
          break;
        } catch (e) {
          console.log(`Failed to load from: ${path}`);
        }
      }

      if (jsonData) {
        await this.parseAndStoreAliases(jsonData);
      } else {
        console.warn('Could not load JSON data from any path, using hardcoded aliases only');
      }
      
    } catch (error) {
      console.error('Error loading aliases from JSON:', error);
      console.log('Falling back to hardcoded aliases only');
    }
  }

  private async parseAndStoreAliases(jsonData: any): Promise<void> {
    if (!this.db) return;

    try {
      let items = [];
      if (Array.isArray(jsonData)) {
        items = jsonData;
      } else if (jsonData['@graph']) {
        items = jsonData['@graph'];
      } else {
        items = [jsonData];
      }

      await this.db.execute('BEGIN TRANSACTION');

      for (const item of items) {
        if (item['http://www.w3.org/2002/07/owl#sameAs']) {
          const mainName = this.extractName(item);
          if (!mainName || mainName === 'Unknown') continue;

          const sameAs = item['http://www.w3.org/2002/07/owl#sameAs'];
          const aliasArray = Array.isArray(sameAs) ? sameAs : [sameAs];

          for (const alias of aliasArray) {
            if (alias['@id']) {
              const aliasName = this.extractNameFromId(alias['@id']);
              if (aliasName && aliasName !== mainName) {
                const id = `json_${mainName}_${aliasName}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                
                // Check if this alias already exists
                const existingResult = await this.db.query(
                  'SELECT id FROM chemical_aliases WHERE main_name = ? AND alias_name = ?',
                  [mainName, aliasName]
                );
                
                if (!existingResult.values?.length) {
                  await this.db.run(
                    'INSERT INTO chemical_aliases (id, main_name, alias_name, source) VALUES (?, ?, ?, ?)',
                    [id, mainName, aliasName, 'json']
                  );
                }
              }
            }
          }
        }
      }

      await this.db.execute('COMMIT');
      await this.loadAllAliases();

    } catch (error) {
      console.error('Error parsing and storing aliases:', error);
      if (this.db) {
        await this.db.execute('ROLLBACK');
      }
    }
  }

  private extractName(item: any): string {
    if (item['http://www.w3.org/2000/01/rdf-schema#label']) {
      const label = item['http://www.w3.org/2000/01/rdf-schema#label'];
      if (Array.isArray(label) && label[0]?.['@value']) {
        return label[0]['@value'];
      } else if (label['@value']) {
        return label['@value'];
      }
    }
    
    if (item['@id']) {
      return this.extractNameFromId(item['@id']);
    }

    return 'Unknown';
  }

  private extractNameFromId(id: string): string {
    if (!id) return 'Unknown';
    
    let name = id.startsWith('id#') ? id.substring(3) : id;
    name = name
      .replace(/\.\./g, ', ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .trim();
      
    return name;
  }

  private async loadAllAliases(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db.query('SELECT * FROM chemical_aliases ORDER BY main_name, alias_name');
      const aliases: ChemicalAlias[] = (result.values || []).map(row => ({
        id: row.id,
        mainName: row.main_name,
        aliasName: row.alias_name
      }));
      
      this.aliasesSubject.next(aliases);
      console.log(`Loaded ${aliases.length} chemical aliases from database`);
    } catch (error) {
      console.error('Error loading aliases from database:', error);
      this.aliasesSubject.next([]);
    }
  }

  public async getMainChemicalName(name: string): Promise<string> {
    if (!name || !this.db) return name;

    try {
      const normalizedInput = this.normalizeChemicalName(name);
      
      // First check if it's already a main name
      const mainNameResult = await this.db.query(
        'SELECT main_name FROM chemical_aliases WHERE LOWER(main_name) = LOWER(?) LIMIT 1',
        [name]
      );
      
      if (mainNameResult?.values?.length) {
        return mainNameResult.values[0].main_name;
      }
      
      // Then check if it's an alias
      const aliasResult = await this.db.query(
        'SELECT main_name FROM chemical_aliases WHERE LOWER(alias_name) = LOWER(?) LIMIT 1',
        [name]
      );
      
      if (aliasResult?.values?.length) {
        return aliasResult.values[0].main_name;
      }
      
      // If not found in database, try with normalized name
      const allAliases = this.aliasesSubject.value;
      for (const alias of allAliases) {
        if (this.normalizeChemicalName(alias.mainName) === normalizedInput) {
          return alias.mainName;
        }
        if (this.normalizeChemicalName(alias.aliasName) === normalizedInput) {
          return alias.mainName;
        }
      }

      for (const [mainName, aliases] of Object.entries(this.hardcodedAliases)) {
        if (this.normalizeChemicalName(mainName) === normalizedInput) {
          return mainName;
        }
        for (const alias of aliases) {
          if (this.normalizeChemicalName(alias) === normalizedInput) {
            return mainName;
          }
        }
      }
      
    } catch (error) {
      console.error('Error getting main chemical name:', error);
    }
    
    return name;
  }

  public async getAllPossibleNamesForChemical(chemicalName: string): Promise<string[]> {
    if (!chemicalName || !this.db) return [chemicalName];

    try {
      const allNames = new Set<string>();
      const mainName = await this.getMainChemicalName(chemicalName);
     
      allNames.add(mainName);
      
      // Get all aliases from database
      const result = await this.db.query(
        'SELECT alias_name FROM chemical_aliases WHERE LOWER(main_name) = LOWER(?)',
        [mainName]
      );
      
      if (result?.values) {
        result.values.forEach(row => allNames.add(row.alias_name));
      }

      for (const [hardcodedMain, hardcodedAliases] of Object.entries(this.hardcodedAliases)) {
        if (this.normalizeChemicalName(hardcodedMain) === this.normalizeChemicalName(mainName)) {
          hardcodedAliases.forEach(alias => allNames.add(alias));
          break;
        }
      }

      // Handle special formatting cases
      this.addFormattingVariations(chemicalName, allNames);

      return Array.from(allNames).filter(name => name && name.trim().length > 0);
      
    } catch (error) {
      console.error('Error getting all possible names:', error);
      return [chemicalName];
    }
  }

  private addFormattingVariations(chemicalName: string, allNames: Set<string>): void {
    if (chemicalName.includes(',')) {
      const parts = chemicalName.split(',').map(part => part.trim());
      allNames.add(parts.join(' '));
      allNames.add(parts.reverse().join(' '));
      allNames.add(parts[0]);
      if (parts[1]) allNames.add(parts[1]);
    }

    if (chemicalName.includes('(') || chemicalName.includes('[')) {
      const cleanName = chemicalName.replace(/[\[\]()]/g, '').trim();
      allNames.add(cleanName);
      
      const bracketContent = chemicalName.match(/\[([^\]]+)\]/);
      if (bracketContent) {
        allNames.add(bracketContent[1]);
      }
      
      const parenContent = chemicalName.match(/\(([^)]+)\)/);
      if (parenContent) {
        allNames.add(parenContent[1]);
      }
    }

    if (chemicalName.includes('..')) {
      const withComma = chemicalName.replace('..', ', ');
      allNames.add(withComma);
      const withSpace = chemicalName.replace('..', ' ');
      allNames.add(withSpace);
    }

    if (chemicalName.includes('|')) {
      const withComma = chemicalName.replace('|', ',');
      allNames.add(withComma);
      const withSpace = chemicalName.replace('|', ' ');
      allNames.add(withSpace);
    }
  }

  public normalizeChemicalName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  public async reloadDatabase(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      
      if (this.db) {
        await this.db.execute('DELETE FROM chemical_aliases');
        await this.loadHardcodedAliases();
        await this.loadAliasesFromJson();
      }
      
    } catch (error) {
      console.error('Error reloading database:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  public getHardcodedAliases(): { [key: string]: string[] } {
    return this.hardcodedAliases;
  }

  // Method to get statistics about the database
  public async getDatabaseStats(): Promise<{
    totalAliases: number;
    hardcodedCount: number;
    jsonCount: number;
    uniqueChemicals: number;
  }> {
    if (!this.db) {
      return { totalAliases: 0, hardcodedCount: 0, jsonCount: 0, uniqueChemicals: 0 };
    }

    try {
      const totalResult = await this.db.query('SELECT COUNT(*) as count FROM chemical_aliases');
      const hardcodedResult = await this.db.query('SELECT COUNT(*) as count FROM chemical_aliases WHERE source = ?', ['hardcoded']);
      const jsonResult = await this.db.query('SELECT COUNT(*) as count FROM chemical_aliases WHERE source = ?', ['json']);
      const uniqueResult = await this.db.query('SELECT COUNT(DISTINCT main_name) as count FROM chemical_aliases');

      return {
        totalAliases: totalResult.values?.[0]?.count || 0,
        hardcodedCount: hardcodedResult.values?.[0]?.count || 0,
        jsonCount: jsonResult.values?.[0]?.count || 0,
        uniqueChemicals: uniqueResult.values?.[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { totalAliases: 0, hardcodedCount: 0, jsonCount: 0, uniqueChemicals: 0 };
    }
  }
}