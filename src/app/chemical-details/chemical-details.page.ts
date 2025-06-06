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

  private chemicalAliases: { [key: string]: string[] } = {
  'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid', 'Acetone and Nitric Acid'],
  'Acetone and Nitric Acid': [],
  'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
  'Acetic Acid': ['Glacial Acetic Acid', 'Acetic Acid, Ethyl Ester', 'Acetoxyethane', 'Ethyl Acetate'],
  'Ethyl Acetate': ['AceticAcid..EthylEster', 'Acetic Acid | Ethyl Ester', 'Acetoxyethane'],
  'Aluminum': ['Aluminum Powder'],
  'Aluminum and Diethyl Ether': [],
  'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
  'Ammonia': [],
  'Acetylene and Ammonia': [],
  'Ammonium Hydroxide': ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water'],
  'Ammonium Hydroxide and Silver Oxide': [],
  'Ammonium Chloride': ['Ammonium Chloratum', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac'],
  'Ammonium Nitrate': ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter'],
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
  'Ethanol': ['Absolute Ethanol', 'Ethyl Alcohol', 'Ethyl Alcohol and Hydrogen Peroxide', 'Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol', 'Carbinol'],
  'Methyl Alcohol': [],
  'Formaldehyde': ['Formalin'],
  'Formaldehyde (37% Solution)': [],
  'Formic Acid': ['Formic Acid (85%)', 'FormicAcid, 85Percent, F.C.C'],
  'Glucose': ['D-Glucose', 'Dextrose (Anhydrous)', 'Dextrose'],
  'Glycerin': ['1,2,3-Propanetriol'],
  'Hydrogen Peroxide': ['Hydrogen Peroxide (30%)', 'Alcohols and Hydrogen Peroxide'],
  '1-Phenyl-2-Methylpropyl Alcohol and Hydrogen Peroxide': [],
  'Alcohols and Hydrogen Peroxide': [],
  'Hydrogen Peroxide and Sulfuric Acid': [],
  'Iodine': [],
  'Iodine and Methanol and Mercuric Oxide': [],
  'Iodine Bromide': [],
  'Iodine Heptafluroide': [],
  'Iron': ['Iron Powder'],
  'Iron Oxide': [],
  'Ferrous Sulfate': ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate'],
  'Ferrous Ammonium Sulfate': ['Ammonium Iron (II) Sulfate, Hexahydrate', 'Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate'],
  'Lactose': ['beta-d-galactopyranosyl-o-4D-glucopyrannose'],
  'Lactose (Anhydrous)': [],
  'Lauric Acid': ['ABL', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid', 'Neo-fat12', 'Neo-fat12-43', 'Vulvic Acid', 'n-Dodecanoic Acid'],
  'Magnesium Oxide': ['Calcined Brucite', 'Magnesia', 'Magnesium Oxide Heavy Powder'],
  'Magnesium Sulfate': [],
  'Magnesium Sulfate (Anhydrous)': [],
  'Melamine': ['2,4,6-Triamino-s-Triazine'],
  'Mercuric Chloride': ['Bichloride of Mercury', 'Calochlor'],
  'Naphthalene': [],
  '1,5-Dinitronaphthalene And Sulfur': [],
  'Nitric Acid': [],
  'Indane and Nitric Acid': [],
  'Oxalic Acid': [],
  'Oxalic Acid (Anhydrous)': [],
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
  'Vinyl Acetate': [],
  'Vinyl Acetate Monomer': [],
  'Zinc Acetate': ['Zinc Diacetate, Dihydrate'],
  'Zinc': ['Zinc Metal', 'Zin', 'Zinc Metal Sheets', 'Zinc Metal Shot', 'Zinc Metal Strips']
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
private getMainChemicalName(name: string): string {
  for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
    if (mainName.toLowerCase() === name.toLowerCase() || 
        aliases.some(alias => alias.toLowerCase() === name.toLowerCase())) {
      return mainName;
    }
  }
  return name;
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
        let chemicalData = this.findChemicalData(allData, this.chemical.name);
 
        if (!chemicalData) {
          const relatedChemicals = this.getAllPossibleNamesForChemical(this.chemical.name);
          console.log('Looking for related chemicals:', relatedChemicals);
          
          for (const relatedName of relatedChemicals) {
            chemicalData = this.findChemicalData(allData, relatedName);
            if (chemicalData) {
              console.log('Found data using related chemical:', relatedName);
              break;
            }
          }
        }
        
        console.log('Found chemical data:', chemicalData);
        
        if (chemicalData && chemicalData.data) {
          console.log('Chemical data keys:', Object.keys(chemicalData.data));
          this.chemicalInfoSections = this.extractChemicalInformation(chemicalData.data);
          console.log('Extracted chemical info sections:', this.chemicalInfoSections);
        } else {
          console.log('No chemical data found for', this.chemical.name);
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

    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      item.name && item.name.toLowerCase() === chemicalName.toLowerCase()
    );

    if (chemical) {
      console.log('Found by exact name match:', chemical.name);
      return chemical;
    }

    const allPossibleNames = this.getAllPossibleNamesForChemical(chemicalName);
    console.log('All possible names for', chemicalName, ':', allPossibleNames);
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

    for (const possibleName of allPossibleNames) {
      const potentialIds = this.generatePotentialIds(possibleName);
      
      for (const potentialId of potentialIds) {
        chemical = allData.find((item: AllDataItem) => {
          if (item.type !== 'chemical') return false;
          const itemId = item.id?.replace('id#', '') || '';
          return this.normalizeChemicalName(itemId) === this.normalizeChemicalName(potentialId);
        });

        if (chemical) {
          console.log('Found by ID transformation:', chemical.name, 'using ID:', potentialId);
          return chemical;
        }
      }
    }

    for (const possibleName of allPossibleNames) {
      chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        const itemName = item.name || '';
        const searchParts = possibleName.toLowerCase().split(/[\s,\[\]().]+/).filter(part => part.length > 2);
        const itemParts = itemName.toLowerCase().split(/[\s,\[\]().]+/).filter(part => part.length > 2);
        
        const matchingParts = searchParts.filter(searchPart => 
          itemParts.some(itemPart => itemPart.includes(searchPart) || searchPart.includes(itemPart))
        );
        
        return matchingParts.length >= Math.min(searchParts.length, 2);
      });

      if (chemical) {
        console.log('Found by partial matching:', chemical.name, 'using partial match with:', possibleName);
        return chemical;
      }
    }

    console.log('No chemical data found for:', chemicalName);
    return null;
  }

 private generatePotentialIds(chemicalName: string): string[] {
  const potentialIds: string[] = [];
  
  const cleanName = chemicalName
    .replace(/[,\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  potentialIds.push(cleanName);
  
  if (chemicalName.includes(',')) {
    const parts = chemicalName.split(',').map(part => part.trim());
    const joinedWithDots = parts.join('..');
    potentialIds.push(joinedWithDots);
    
    const capitalizedParts = parts.map(part => 
      part.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('')
    );
    potentialIds.push(capitalizedParts.join('..'));
  }
  
  const withNumbers = cleanName.replace(/(\d+)/g, '$1');
  if (withNumbers !== cleanName) {
    potentialIds.push(withNumbers);
  }
  
  return potentialIds;
}

  private getAllPossibleNamesForChemical(chemicalName: string): string[] {
  const allNames = new Set<string>();
  allNames.add(chemicalName);
  const directAliases = this.chemicalAliases[chemicalName] || [];
  directAliases.forEach(alias => allNames.add(alias));

  for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
    if (aliases.some(alias => alias.toLowerCase() === chemicalName.toLowerCase())) {
      allNames.add(mainName);
      aliases.forEach(alias => allNames.add(alias));
      break;
    }
  }

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