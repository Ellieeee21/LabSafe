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
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
    'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'Acetic Acid': ['Glacial Acetic Acid'],
    'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
    '3,5-Dinitrosalicylic Acid': ['2-hydroxy-3,5-dinitrobenzoic Acid'],
    '1,2,3-Benzenetriol': ['Pyrogallic Acid', '1,2,3-Trihydroxybenzene'],
    '1,2,3-Propanetriol': ['Glycerin'],
    '1,2-Benzenedicarboxylic Acid Monopotassium Salt': ['Potassium Bitphthlate', 'Pthalic Acid Monopotassium Salt'],
    '2,2\'-Oxydiethanol': ['Diethylene Glycol', 'Carbitol'],
    '2,4,6-Triamino-s-Triazine': ['Melamine'],
    '2-Amino-2-(hydroxymethyl)propane-1,3-diol Hydrochloride': ['Tris(hydroxymethyl)methylamine'],
    '2-Hydroxy-1,2,3-propanetricarboxylic Acid': ['Citric Acid'],
    '2-hydroxy-3,5-dinitrobenzoic Acid': ['3,5-Dinitrosalicylic Acid'],
    '2-Hydroxybenzoic Acid': ['Salicylic Acid'],
    '2-propanone': ['Acetone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'ABL': ['Lauric Acid', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid', 'Neo-fat12', 'Neo-fat12-43', 'Vulvic Acid', 'n-Dodecanoic Acid'],
    'Absolute Ethanol': ['Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol'],
    'AceticAcid..EthylEster': ['Acetic Acid', 'Ethyl Ester', 'Ethyl Acetate', 'Acetoxyethane'],
    'Alpha-alumina': ['Aluminum Oxide', 'Aluminia', 'Aluminum Oxide Powder'],
    'Ametox, Antichlor': ['Sodium Thiosulfate Pentahydrate'],
    'Ammonium Chloratum': ['Ammonium Chloride', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac'],
    'Ammonium Hydroxide': ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water'],
    'Ammonium Iron (II) Sulfate, Hexahydrate': ['Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate'],
    'Ammonium Nitrate': ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter'],
    'Ammonium Sulfate': ['Diammonium Salt with Sulfuric Acid'],
    'Anilinobenzene': ['Diphenylamine'],
    'Barium Chloride Anhydrous': ['Barium Dichloride Anhydrous'],
    'Barium Chloride Dihydrate': ['Barium Dichloride Dihydrate'],
    'Benzene': ['Benzine', 'Benzol'],
    'beta-d-galactopyranosyl-o-4D-glucopyrannose': ['Lactose', 'Lactose (Anhydrous)'],
    'Bichloride of Mercury': ['Mercuric Chloride', 'Calochlor'],
    'Bichromate of Potash': ['Potassium Dichromate'],
    'Blue Vitriol': ['Copper Sulfate Pentahydrate'],
    'Butanaminim,N,N,N-tributyl,chloride,monohydrate': ['Tetrabutylammonium Chloride Hydrate'],
    'Calcined Brucite': ['Magnesium Oxide', 'Magnesia', 'Magnesium Oxide Heavy Powder'],
    'Carbinol': ['Methyl Alcohol'],
    'Caustic Soda': ['Sodium Hydroxide'],
    'Chloroform': ['Trichloromethane'],
    'Hydrogen Potassium Pthalate': ['Potassium Bitphthlate'],
    'Hydrogen Sulfite Sodium': ['Sodium Bisulfite'],
    'Kaolin Colloidal Powder': ['Kaolin Powder'],
    'Magnesium Sulfate': ['Anhydrous'],
    'Oxalic Acid': ['Oxalic Acid (Anhydrous)'],
    'Phenolphthalien': ['0.5% in 50% Isopropanol'],
    'Phosphorus Pentoxide': ['Di-phosphorus Pentoxide'],
    'Copper (II) Sulfate Pentahydrate': ['Copper Sulfate Pentahydrate'],
    'Cupric Chloride Dihydrate': ['Copper Chloride Dihydrate', 'Coppertrace'],
    'Cupric Oxide': ['Copper (II) Oxide'],
    'D-Glucose': ['Dextrose (Anhydrous)', 'Dextrose'],
    'Di-phosphorus Pentoxide': ['Phosphorus Pentoxide'],
    'Ferrous Sulfate': ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate'],
    'Formaldehyde (37% Solution)': ['Formalin'],
    'Formic Acid (85%)': ['FormicAcid, 85Percent, F.C.C'],
    'Polyethylene Glycol 400': ['PEG400', 'PEG-8', 'Poly(oxy-1,2-ethanediyl).alpha.-hydro-.omega.-hydroxy-'],
    'Polysorbate 80': ['Polyethylene Oxide Sorbitan Mono-oleate', 'Polyoxyethylene 20 Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Oleate', 'Sorbitan Mono-9-otadecenoate Poly(Oxy-1,2-ethanediyl) Derivatives', 'Sorethytanop20cpMonooleate', 'TWEEN80'],
    'Potassium Phosphate Dibasic': ['Dipotassium Phosphate'],
    'Potassium Phosphate Monobasic': ['Monopotassium Phosphate', 'PhosphoricAcid,MonopotassiumSalt', 'Potassium Dihydrogen Phospate'],
    'Sodium Azide': ['Hydrazoic Acid, Sodium Salt', 'Smite'],
    'Sodium Bisulfite': ['Hydrogen Sulfite Sodium', 'Monosodium Salt Sulfurous Acid', 'Monosodium Sulfite', 'Sodium Acid Sulfite', 'Sodium Hydrogen Sulfite', 'Sodium Sulhydrate'],
    'Sodium Lauryl Sulfate': ['Sodium Dodecyl Sulfate', 'Sulfuric Acid, Monododecyl Ester, Sodium Salt'],
    'Sodium Phosphate Dibasic': ['Dibasic Sodium Phosphate', 'Disodium Hydrogen Phosphate', 'Disodium Monohydrogen Phosphate', 'Disodium Orthophosphate', 'Disodium Phosphoric Acid', 'Phosphoric Acid, Disodium Salt', 'Soda Phosphate', 'Sodium Hydrogen Phosphate', 'Sodium Monohydrogen Phosphate'],
    'Sulfuric Acid': ['Oil of Vitriol'],
    'Triethanolamine': ['Ethanol,2,2,2-nitrilotris', 'Tri(2-hydroxyethyl)amine', 'Trolamine'],
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
    
    // First try exact match
    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      item.name && item.name.toLowerCase() === chemicalName.toLowerCase()
    );

    if (chemical) {
      console.log('Found by exact name match:', chemical.name);
      return chemical;
    }

    // Try normalized search
    const searchName = this.normalizeChemicalName(chemicalName);
    console.log('Normalized search name:', searchName);
    
    chemical = allData.find((item: AllDataItem) => {
      if (item.type !== 'chemical') return false;
      
      const itemName = this.normalizeChemicalName(item.name || '');
      const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
      
      return itemName === searchName || itemId === searchName;
    });

    if (chemical) {
      console.log('Found by normalized name:', chemical.name);
      return chemical;
    }

    // Try to find the main chemical name from aliases
    const mainChemicalName = this.getMainChemicalName(chemicalName);
    if (mainChemicalName !== chemicalName) {
      console.log('Trying main chemical name:', mainChemicalName);
      return this.findChemicalData(allData, mainChemicalName);
    }

    // Try reverse lookup - find if current name is a main name for any aliases
    const aliasChemicalName = this.findChemicalByAlias(chemicalName);
    if (aliasChemicalName !== chemicalName) {
      console.log('Trying alias chemical name:', aliasChemicalName);
      return this.findChemicalData(allData, aliasChemicalName);
    }

    // Try partial matching for complex names
    chemical = allData.find((item: AllDataItem) => {
      if (item.type !== 'chemical') return false;
      const itemName = item.name || '';
      const itemId = item.id?.replace('id#', '') || '';
      
      // Check if the chemical name contains key parts of the search name
      const searchParts = chemicalName.toLowerCase().split(/[\s,\[\]]+/).filter(part => part.length > 2);
      const itemParts = itemName.toLowerCase().split(/[\s,\[\]]+/).filter(part => part.length > 2);
      
      // If at least 70% of search parts are found in item name
      const matchingParts = searchParts.filter(searchPart => 
        itemParts.some(itemPart => itemPart.includes(searchPart) || searchPart.includes(itemPart))
      );
      return matchingParts.length >= Math.ceil(searchParts.length * 0.7);
    });

    if (chemical) {
      console.log('Found by partial matching:', chemical.name);
      return chemical;
    }

    return null;
  }

  private findChemicalByAlias(aliasName: string): string {
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (aliases.some(alias => alias.toLowerCase() === aliasName.toLowerCase())) {
        return mainName;
      }
    }
    return aliasName;
  }

  private getMainChemicalName(name: string): string {
    // First check if the name itself is a main chemical
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (mainName.toLowerCase() === name.toLowerCase()) {
        return mainName;
      }
    }
    
    // Then check if it's an alias
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (aliases.some(alias => alias.toLowerCase() === name.toLowerCase())) {
        return mainName;
      }
    }
    
    return name;
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