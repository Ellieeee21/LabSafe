import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical, AllDataItem } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonButton, IonIcon, IonSpinner, IonBackButton, IonButtons,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline, arrowBackOutline
} from 'ionicons/icons';

interface ChemicalInfoSection {
  title: string;
  content: string[];
}

@Component({
  selector: 'app-chemical-details',
  templateUrl: './chemical-details.page.html',
  styleUrls: ['./chemical-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardContent, IonIcon, IonSpinner, IonText
  ]
})
export class ChemicalDetailsPage implements OnInit {
  chemical: Chemical | null = null;
  chemicalInfoSections: ChemicalInfoSection[] = [];
  isLoading = true;
  error: string | null = null;

  // Enhanced chemical aliases mapping
  private chemicalAliases: { [key: string]: string[] } = {
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
    'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'Acetic Acid': ['Glacial Acetic Acid', 'Acetic Acid,Ethyl Ester', 'Ethyl Acetate', 'Acetoxyethane'],
    'Acetic Acid,Ethyl Ester': ['Acetic Acid', 'Ethyl Acetate', 'Acetoxyethane', 'AceticAcid..EthylEster'],
    'Ethyl Acetate': ['Acetic Acid', 'Acetic Acid,Ethyl Ester', 'AceticAcid..EthylEster', 'Acetoxyethane'],
    'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
    '3,5-Dinitrosalicylic Acid': ['2-hydroxy-3,5-dinitrobenzoic Acid'],
    '1,2,3-Benzenetriol': ['Pyrogallic Acid', '1,2,3-Trihydroxybenzene'],
    '1,2,3-Propanetriol': ['Glycerin'],
    'Glycerin': ['1,2,3-Propanetriol'],
    '1,2-Benzenedicarboxylic Acid Monopotassium Salt': ['Potassium Bitphthlate', 'Pthalic Acid Monopotassium Salt'],
    '2,2\'-Oxydiethanol': ['Diethylene Glycol', 'Carbitol'],
    '2,4,6-Triamino-s-Triazine': ['Melamine'],
    '2-Amino-2-(hydroxymethyl)propane-1,3-diol Hydrochloride': ['Tris(hydroxymethyl)methylamine'],
    '2-Hydroxy-1,2,3-propanetricarboxylic Acid': ['Citric Acid'],
    'Citric Acid': ['2-Hydroxy-1,2,3-propanetricarboxylic Acid'],
    '2-Hydroxybenzoic Acid': ['Salicylic Acid'],
    'Salicylic Acid': ['2-Hydroxybenzoic Acid'],
    'ABL': ['Lauric Acid', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid'],
    'Lauric Acid': ['ABL', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid'],
    'Absolute Ethanol': ['Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol'],
    'Ammonium Chloride': ['Ammonium Chloratum', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac'],
    'Ammonium Hydroxide': ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water'],
    'Ammonium Iron (II) Sulfate, Hexahydrate': ['Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate'],
    'Ammonium Nitrate': ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter'],
    'Ammonium Sulfate': ['Diammonium Salt with Sulfuric Acid'],
    'Benzene': ['Benzine', 'Benzol'],
    'Lactose': ['beta-d-galactopyranosyl-o-4D-glucopyrannose', 'Lactose (Anhydrous)'],
    'Mercuric Chloride': ['Bichloride of Mercury', 'Calochlor'],
    'Potassium Dichromate': ['Bichromate of Potash'],
    'Copper Sulfate Pentahydrate': ['Blue Vitriol', 'Copper (II) Sulfate Pentahydrate'],
    'Magnesium Oxide': ['Calcined Brucite', 'Magnesia', 'Magnesium Oxide Heavy Powder'],
    'Methyl Alcohol': ['Carbinol'],
    'Sodium Hydroxide': ['Caustic Soda'],
    'Chloroform': ['Trichloromethane'],
    'D-Glucose': ['Dextrose (Anhydrous)', 'Dextrose'],
    'Ferrous Sulfate': ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate'],
    'Formaldehyde (37% Solution)': ['Formalin'],
    'Formic Acid (85%)': ['FormicAcid, 85Percent, F.C.C'],
    'Polyethylene Glycol 400': ['PEG400', 'PEG-8'],
    'Polysorbate 80': ['TWEEN80', 'Polyethylene Oxide Sorbitan Mono-oleate'],
    'Potassium Phosphate Dibasic': ['Dipotassium Phosphate'],
    'Potassium Phosphate Monobasic': ['Monopotassium Phosphate'],
    'Sodium Azide': ['Hydrazoic Acid, Sodium Salt', 'Smite'],
    'Sodium Bisulfite': ['Hydrogen Sulfite Sodium', 'Monosodium Salt Sulfurous Acid'],
    'Sodium Lauryl Sulfate': ['Sodium Dodecyl Sulfate'],
    'Sodium Phosphate Dibasic': ['Dibasic Sodium Phosphate', 'Disodium Hydrogen Phosphate'],
    'Sulfuric Acid': ['Oil of Vitriol'],
    'Triethanolamine': ['Tri(2-hydroxyethyl)amine', 'Trolamine'],
    'Vinyl Acetate': ['Vinyl Acetate Monomer'],
    'Zinc Acetate': ['Zinc Diacetate, Dihydrate'],
    'Zinc Metal': ['Zin', 'Zinc Metal Sheets', 'Zinc Metal Shot', 'Zinc Metal Strips']
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService
  ) {
    addIcons({ 
      homeOutline, flaskOutline, timeOutline, personOutline, arrowBackOutline
    });
  }

  async ngOnInit() {
    const chemicalId = this.route.snapshot.paramMap.get('id');
    if (chemicalId) {
      await this.loadChemicalDetails(chemicalId);
    } else {
      this.error = 'Invalid chemical ID';
      this.isLoading = false;
    }
  }

  async loadChemicalDetails(chemicalId: string) {
    try {
      this.isLoading = true;
      this.error = null;
      
      const numericId = parseInt(chemicalId, 10);
      
      if (isNaN(numericId)) {
        this.error = 'Invalid chemical ID format';
        return;
      }
      
      this.chemical = this.getChemicalById(numericId);
      
      if (!this.chemical) {
        this.error = 'Chemical not found';
      } else {
        await this.loadChemicalInformation();
      }
      
    } catch (error) {
      console.error('Error loading chemical details:', error);
      this.error = 'Failed to load chemical details';
    } finally {
      this.isLoading = false;
    }
  }

  private getChemicalById(id: number): Chemical | null {
    const chemicals = this.databaseService.getChemicals();
    return chemicals.find(chemical => chemical.id === id) || null;
  }

  private async loadChemicalInformation() {
    try {
      const allData = this.databaseService.getCurrentAllData();
      console.log('All data length:', allData.length);
      
      if (allData && allData.length > 0 && this.chemical) {
        const chemicalData = this.findChemicalData(allData, this.chemical.name);
        console.log('Found chemical data:', chemicalData);
        
        if (chemicalData && chemicalData.data) {
          console.log('Chemical data keys:', Object.keys(chemicalData.data));
          this.chemicalInfoSections = this.extractChemicalInformation(chemicalData.data);
          console.log('Extracted chemical info sections:', this.chemicalInfoSections);
        } else {
          console.log('No chemical data found');
          this.chemicalInfoSections = [];
        }
      } else {
        console.log('No database data available');
        this.chemicalInfoSections = [];
      }
    } catch (error) {
      console.error('Error loading chemical information:', error);
      this.chemicalInfoSections = [];
    }
  }

  private findChemicalData(allData: AllDataItem[], chemicalName: string): AllDataItem | null {
    console.log('Looking for chemical with name:', chemicalName);
    
    // Step 1: Try exact match first
    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      item.name && item.name.toLowerCase() === chemicalName.toLowerCase()
    );

    if (chemical) {
      console.log('Found by exact name match:', chemical.name);
      return chemical;
    }

    // Step 2: Try all possible aliases and related names
    const allPossibleNames = this.getAllPossibleNamesForChemical(chemicalName);
    console.log('All possible names for', chemicalName, ':', allPossibleNames);

    // Try each possible name for exact match
    for (const possibleName of allPossibleNames) {
      chemical = allData.find((item: AllDataItem) => 
        item.type === 'chemical' && 
        item.name && item.name.toLowerCase() === possibleName.toLowerCase()
      );

      if (chemical) {
        console.log('Found by alias match:', chemical.name, 'using alias:', possibleName);
        return chemical;
      }
    }

    // Step 3: Try normalized matching
    for (const possibleName of allPossibleNames) {
      const searchName = this.normalizeChemicalName(possibleName);
      
      chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        
        const itemName = this.normalizeChemicalName(item.name || '');
        const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
        
        return itemName === searchName || itemId === searchName;
      });

      if (chemical) {
        console.log('Found by normalized name:', chemical.name, 'using normalized alias:', possibleName);
        return chemical;
      }
    }

    // Step 4: Try partial matching for compound names
    for (const possibleName of allPossibleNames) {
      chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        const itemName = item.name || '';
        
        // Check if the item name contains key parts of the search name
        const searchParts = possibleName.toLowerCase().split(/[\s,\[\]().]+/).filter(part => part.length > 2);
        const itemParts = itemName.toLowerCase().split(/[\s,\[\]().]+/).filter(part => part.length > 2);
        
        const matchingParts = searchParts.filter(searchPart => 
          itemParts.some(itemPart => itemPart.includes(searchPart) || searchPart.includes(itemPart))
        );
        
        return matchingParts.length >= Math.min(searchParts.length, 2); // At least 2 parts or all parts if less than 2
      });

      if (chemical) {
        console.log('Found by partial matching:', chemical.name, 'using partial match with:', possibleName);
        return chemical;
      }
    }

    // Step 5: Special handling for comma-separated compound names
    if (chemicalName.includes(',')) {
      const parts = chemicalName.split(',').map(part => part.trim());
      const combinations = [
        parts.join(' '), 
        parts.reverse().join(' '),
        parts[0], // Try just the first part
        parts[1]  // Try just the second part
      ];

      for (const combination of combinations) {
        const result = this.findChemicalData(allData, combination);
        if (result) {
          console.log('Found by compound name transformation:', result.name, 'using:', combination);
          return result;
        }
      }
    }

    // Step 6: Try looking for any chemical that might be a parent compound
    const baseChemicalName = chemicalName.split(/[,\[\]()]/)[0].trim();
    if (baseChemicalName !== chemicalName) {
      const result = this.findChemicalData(allData, baseChemicalName);
      if (result) {
        console.log('Found by base chemical name:', result.name, 'using base:', baseChemicalName);
        return result;
      }
    }

    console.log('No chemical data found for:', chemicalName);
    return null;
  }

  private getAllPossibleNamesForChemical(chemicalName: string): string[] {
    const allNames = new Set<string>();
    allNames.add(chemicalName);

    // Add direct aliases
    const directAliases = this.chemicalAliases[chemicalName] || [];
    directAliases.forEach(alias => allNames.add(alias));

    // Check if this chemical is listed as an alias for another chemical
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (aliases.some(alias => alias.toLowerCase() === chemicalName.toLowerCase())) {
        allNames.add(mainName);
        aliases.forEach(alias => allNames.add(alias));
        break;
      }
    }

    // Handle comma-separated names
    if (chemicalName.includes(',')) {
      const parts = chemicalName.split(',').map(part => part.trim());
      allNames.add(parts.join(' '));
      allNames.add(parts.reverse().join(' '));
      allNames.add(parts[0]); // Add first part
      if (parts[1]) allNames.add(parts[1]); // Add second part if exists
    }

    // Handle bracketed names and parentheses
    if (chemicalName.includes('(') || chemicalName.includes('[')) {
      const cleanName = chemicalName.replace(/[\[\]()]/g, '').trim();
      allNames.add(cleanName);
      
      // Extract content within brackets/parentheses
      const bracketContent = chemicalName.match(/\[([^\]]+)\]/);
      if (bracketContent) {
        allNames.add(bracketContent[1]);
      }
      
      const parenContent = chemicalName.match(/\(([^)]+)\)/);
      if (parenContent) {
        allNames.add(parenContent[1]);
      }
    }

    // Handle special cases with dots
    if (chemicalName.includes('..')) {
      const withComma = chemicalName.replace('..', ', ');
      allNames.add(withComma);
      const withSpace = chemicalName.replace('..', ' ');
      allNames.add(withSpace);
    }

    return Array.from(allNames);
  }

  private normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  
      .trim();
  }

  private extractChemicalInformation(data: any): ChemicalInfoSection[] {
    const sections: ChemicalInfoSection[] = [];

    // Health Level
    const healthKeys = ['id#hasHealthLevel', 'hasHealthLevel'];
    for (const key of healthKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          sections.push({
            title: 'Health Level',
            content: [this.cleanStepText(level)]
          });
          break;
        }
      }
    }

    // Flammability Level
    const flammabilityKeys = ['id#hasFlammabilityLevel', 'hasFlammabilityLevel'];
    for (const key of flammabilityKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          sections.push({
            title: 'Flammability Level',
            content: [this.cleanStepText(level)]
          });
          break;
        }
      }
    }

    // Instability/Reactivity Level
    const instabilityKeys = ['id#hasInstabilityOrReactivityLevel', 'hasInstabilityOrReactivityLevel'];
    for (const key of instabilityKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          sections.push({
            title: 'Instability/Reactivity Level',
            content: [this.cleanStepText(level)]
          });
          break;
        }
      }
    }

    // Physical Hazards
    const physicalHazardKeys = ['id#hasPhysicalHazards', 'hasPhysicalHazards'];
    for (const key of physicalHazardKeys) {
      if (data[key]) {
        const hazards = this.extractStepsFromProperty(data[key], key);
        if (hazards.length > 0) {
          sections.push({
            title: 'Physical Hazards',
            content: hazards
          });
        }
        break;
      }
    }

    // Health Hazards
    const healthHazardKeys = ['id#hasHealthHazards', 'hasHealthHazards'];
    for (const key of healthHazardKeys) {
      if (data[key]) {
        const hazards = this.extractStepsFromProperty(data[key], key);
        if (hazards.length > 0) {
          sections.push({
            title: 'Health Hazards',
            content: hazards
          });
        }
        break;
      }
    }

    // Stability Info
    const stabilityKeys = ['id#hasStabilityAtNormalConditions', 'hasStabilityAtNormalConditions'];
    for (const key of stabilityKeys) {
      if (data[key]) {
        const stability = this.extractSimpleValue(data[key]);
        if (stability) {
          sections.push({
            title: 'Stability Info',
            content: [this.cleanStepText(stability)]
          });
          break;
        }
      }
    }

    // Conditions of Instability
    const instabilityConditionKeys = ['id#hasConditionsOfInstability', 'hasConditionsOfInstability'];
    for (const key of instabilityConditionKeys) {
      if (data[key]) {
        const conditions = this.extractStepsFromProperty(data[key], key);
        if (conditions.length > 0) {
          sections.push({
            title: 'Conditions of Instability',
            content: conditions
          });
        }
        break;
      }
    }

    // Incompatible Materials
    const incompatibilityKeys = ['id#hasIncompatibilityIssuesWith', 'hasIncompatibilityIssuesWith'];
    for (const key of incompatibilityKeys) {
      if (data[key]) {
        const incompatibles = this.extractStepsFromProperty(data[key], key);
        if (incompatibles.length > 0) {
          sections.push({
            title: 'Incompatible Materials',
            content: incompatibles
          });
        }
        break;
      }
    }

    // Reactive Substances
    const reactivityKeys = ['id#hasReactivityWith', 'hasReactivityWith'];
    for (const key of reactivityKeys) {
      if (data[key]) {
        const reactives = this.extractStepsFromProperty(data[key], key);
        if (reactives.length > 0) {
          sections.push({
            title: 'Reactive Substances',
            content: reactives
          });
        }
        break;
      }
    }

    // Polymerization
    const polymerizationKeys = ['id#hasPolymerization', 'hasPolymerization'];
    for (const key of polymerizationKeys) {
      if (data[key]) {
        const polymerization = this.extractSimpleValue(data[key]);
        if (polymerization) {
          sections.push({
            title: 'Polymerization',
            content: [this.cleanStepText(polymerization)]
          });
          break;
        }
      }
    }

    return sections;
  }

  private extractStepsFromProperty(property: any, propName: string): string[] {
    const steps: string[] = [];
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        const stepText = this.extractSingleValue(item);
        if (stepText && stepText.trim().length > 0) {
          const cleanedText = this.cleanStepText(stepText);
          steps.push(cleanedText);
        }
      });
    } else {
      const stepText = this.extractSingleValue(property);
      if (stepText && stepText.trim().length > 0) {
        const cleanedText = this.cleanStepText(stepText);
        steps.push(cleanedText);
      }
    }
    
    return steps;
  }

  private cleanStepText(text: string): string {
    let cleaned = text.replace(/^Post\s+/i, '');
    cleaned = cleaned.replace(/Phys\s+Haz/gi, 'Physical Hazards');
    cleaned = cleaned.replace(/Health\s+Haz/gi, 'Health Hazards');
    cleaned = cleaned.replace(/^Fire\s+Fighting\s+/i, '');
    
    return cleaned;
  }

  private extractSingleValue(item: any): string {
    if (!item) return '';
    
    if (typeof item === 'string') {
      return item;
    }
    
    if (typeof item === 'object') {
      if (item['@id']) {
        return this.formatIdValue(item['@id']);
      }
      
      if (item['@value']) {
        return item['@value'];
      }
      
      if (item.value) {
        return item.value;
      }
      
      if (item['http://www.w3.org/2000/01/rdf-schema#label']) {
        const label = item['http://www.w3.org/2000/01/rdf-schema#label'];
        if (typeof label === 'string') return label;
        if (Array.isArray(label) && label.length > 0) {
          return typeof label[0] === 'string' ? label[0] : (label[0]['@value'] || '');
        }
        if (label['@value']) return label['@value'];
      }
    }
    
    return '';
  }

  private extractSimpleValue(property: any): string {
    if (Array.isArray(property) && property.length > 0) {
      return this.extractSingleValue(property[0]);
    } else {
      return this.extractSingleValue(property);
    }
  }

  private formatIdValue(id: string): string {
    if (!id) return '';
    
    return id
      .replace('id#', '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .replace(/\.\./g, ', ')
      .trim();
  }

  // Navigation methods
  navigateToHome() {
    console.log('Navigating to emergency types...');
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    console.log('Navigating to chemical list...');
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
    // TODO: Implement history navigation when ready
  }

  navigateToProfile() {
    console.log('Navigating to profile...');
    this.router.navigate(['/profile']);
  }

  goBack() {
    console.log('Going back to chemical list...');
    this.navigateToChemicals();
  }
}