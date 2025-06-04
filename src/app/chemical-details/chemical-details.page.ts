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

interface ChemicalRelationship {
  mainName: string;
  aliases: string[];
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

  private chemicalRelationships: ChemicalRelationship[] = [
    {
      mainName: '1,2,3-Benzenetriol',
      aliases: ['Pyrogallic Acid', '1,2,3-Trihydroxybenzene']
    },
    {
      mainName: '1,2,3-Propanetriol',
      aliases: ['Glycerin']
    },
    {
      mainName: '1,2-Benzenedicarboxylic Acid Monopotassium Salt',
      aliases: ['Potassium Bitphthlate', 'Pthalic Acid Monopotassium Salt']
    },
    {
      mainName: '2,2\'-Oxydiethanol',
      aliases: ['Diethylene Glycol', 'Carbitol']
    },
    {
      mainName: '2,4,6-Triamino-s-Triazine',
      aliases: ['Melamine']
    },
    {
      mainName: '2-Amino-2-(hydroxymethyl)propane-1,3-diol Hydrochloride',
      aliases: ['Tris(hydroxymethyl)methylamine']
    },
    {
      mainName: '2-Hydroxy-1,2,3-propanetricarboxylic Acid',
      aliases: ['Citric Acid']
    },
    {
      mainName: '2-hydroxy-3,5-dinitrobenzoic Acid',
      aliases: ['3,5-Dinitrosalicylic Acid']
    },
    {
      mainName: '2-Hydroxybenzoic Acid',
      aliases: ['Salicylic Acid']
    },
    {
      mainName: '2-propanone',
      aliases: ['Acetone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid']
    },
    {
      mainName: 'ABL',
      aliases: ['Lauric Acid', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid', 'Neo-fat12', 'Neo-fat12-43', 'Vulvic Acid', 'n-Dodecanoic Acid']
    },
    {
      mainName: 'Absolute Ethanol',
      aliases: ['Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol']
    },
    {
      mainName: 'Acetic Acid',
      aliases: ['Glacial Acetic Acid', 'AceticAcid..EthylEster', 'Acetic Acid, Ethyl Ester', 'Ethyl Acetate', 'Acetoxyethane', 'Acetic Acid,Ethyl Ester']
    },
    {
      mainName: 'Activated Carbon',
      aliases: ['Activated Charcoal', 'Activated Charcoal Powder']
    },
    {
      mainName: 'Alpha-alumina',
      aliases: ['Aluminum Oxide', 'Aluminia', 'Aluminum Oxide Powder']
    },
    {
      mainName: 'Ametox, Antichlor',
      aliases: ['Sodium Thiosulfate Pentahydrate']
    },
    {
      mainName: 'Ammonium Chloratum',
      aliases: ['Ammonium Chloride', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac']
    },
    {
      mainName: 'Ammonium Hydroxide',
      aliases: ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water']
    },
    {
      mainName: 'Ammonium Iron (II) Sulfate, Hexahydrate',
      aliases: ['Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate']
    },
    {
      mainName: 'Ammonium Nitrate',
      aliases: ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter']
    },
    {
      mainName: 'Ammonium Sulfate',
      aliases: ['Diammonium Salt with Sulfuric Acid']
    },
    {
      mainName: 'Anilinobenzene',
      aliases: ['Diphenylamine']
    },
    {
      mainName: 'Barium Chloride Anhydrous',
      aliases: ['Barium Dichloride Anhydrous']
    },
    {
      mainName: 'Barium Chloride Dihydrate',
      aliases: ['Barium Dichloride Dihydrate']
    },
    {
      mainName: 'Benzene',
      aliases: ['Benzine', 'Benzol']
    },
    {
      mainName: 'beta-d-galactopyranosyl-o-4D-glucopyrannose',
      aliases: ['Lactose', 'Lactose (Anhydrous)']
    },
    {
      mainName: 'Bichloride of Mercury',
      aliases: ['Mercuric Chloride', 'Calochlor']
    },
    {
      mainName: 'Bichromate of Potash',
      aliases: ['Potassium Dichromate']
    },
    {
      mainName: 'Blue Vitriol',
      aliases: ['Copper Sulfate Pentahydrate']
    },
    {
      mainName: 'Butanaminim,N,N,N-tributyl,chloride,monohydrate',
      aliases: ['Tetrabutylammonium Chloride Hydrate']
    },
    {
      mainName: 'Calcined Brucite',
      aliases: ['Magnesium Oxide', 'Magnesia', 'Magnesium Oxide Heavy Powder']
    },
    {
      mainName: 'Carbinol',
      aliases: ['Methyl Alcohol']
    },
    {
      mainName: 'Caustic Soda',
      aliases: ['Sodium Hydroxide']
    },
    {
      mainName: 'Chloroform',
      aliases: ['Trichloromethane']
    },
    {
      mainName: 'Hydrogen Potassium Pthalate',
      aliases: ['Potassium Bitphthlate']
    },
    {
      mainName: 'Hydrogen Sulfite Sodium',
      aliases: ['Sodium Bisulfite']
    },
    {
      mainName: 'Kaolin Colloidal Powder',
      aliases: ['Kaolin Powder']
    },
    {
      mainName: 'Magnesium Sulfate',
      aliases: ['Anhydrous']
    },
    {
      mainName: 'Oxalic Acid',
      aliases: ['Oxalic Acid (Anhydrous)']
    },
    {
      mainName: 'Phenolphthalien',
      aliases: ['0.5% in 50% Isopropanol']
    },
    {
      mainName: 'Phosphorus Pentoxide',
      aliases: ['Di-phosphorus Pentoxide']
    },
    {
      mainName: 'Copper (II) Sulfate Pentahydrate',
      aliases: ['Copper Sulfate Pentahydrate']
    },
    {
      mainName: 'Cupric Chloride Dihydrate',
      aliases: ['Copper Chloride Dihydrate', 'Coppertrace']
    },
    {
      mainName: 'Cupric Oxide',
      aliases: ['Copper (II) Oxide']
    },
    {
      mainName: 'D-Glucose',
      aliases: ['Dextrose (Anhydrous)', 'Dextrose']
    },
    {
      mainName: 'Di-phosphorus Pentoxide',
      aliases: ['Phosphorus Pentoxide']
    },
    {
      mainName: 'Ferrous Sulfate',
      aliases: ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate']
    },
    {
      mainName: 'Formaldehyde (37% Solution)',
      aliases: ['Formalin']
    },
    {
      mainName: 'Formic Acid (85%)',
      aliases: ['FormicAcid, 85Percent, F.C.C']
    },
    {
      mainName: 'Polyethylene Glycol 400',
      aliases: ['PEG400', 'PEG-8', 'Poly(oxy-1,2-ethanediyl).alpha.-hydro-.omega.-hydroxy-']
    },
    {
      mainName: 'Polysorbate 80',
      aliases: ['Polyethylene Oxide Sorbitan Mono-oleate', 'Polyoxyethylene 20 Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Monooleate', 'Polyoxyethylene Sorbitan Oleate', 'Sorbitan Mono-9-otadecenoate Poly(Oxy-1,2-ethanediyl) Derivatives', 'Sorethytanop20cpMonooleate', 'TWEEN80']
    },
    {
      mainName: 'Potassium Phosphate Dibasic',
      aliases: ['Dipotassium Phosphate']
    },
    {
      mainName: 'Potassium Phosphate Monobasic',
      aliases: ['Monopotassium Phosphate', 'PhosphoricAcid,MonopotassiumSalt', 'Potassium Dihydrogen Phospate']
    },
    {
      mainName: 'Sodium Azide',
      aliases: ['Hydrazoic Acid, Sodium Salt', 'Smite']
    },
    {
      mainName: 'Sodium Bisulfite',
      aliases: ['Hydrogen Sulfite Sodium', 'Monosodium Salt Sulfurous Acid', 'Monosodium Sulfite', 'Sodium Acid Sulfite', 'Sodium Hydrogen Sulfite', 'Sodium Sulhydrate']
    },
    {
      mainName: 'Sodium Lauryl Sulfate',
      aliases: ['Sodium Dodecyl Sulfate', 'Sulfuric Acid, Monododecyl Ester, Sodium Salt']
    },
    {
      mainName: 'Sodium Phosphate Dibasic',
      aliases: ['Dibasic Sodium Phosphate', 'Disodium Hydrogen Phosphate', 'Disodium Monohydrogen Phosphate', 'Disodium Orthophosphate', 'Disodium Phosphoric Acid', 'Phosphoric Acid, Disodium Salt', 'Soda Phosphate', 'Sodium Hydrogen Phosphate', 'Sodium Monohydrogen Phosphate']
    },
    {
      mainName: 'Sulfuric Acid',
      aliases: ['Oil of Vitriol']
    },
    {
      mainName: 'Triethanolamine',
      aliases: ['Ethanol,2,2,2-nitrilotris', 'Tri(2-hydroxyethyl)amine', 'Trolamine']
    },
    {
      mainName: 'Vinyl Acetate',
      aliases: ['Vinyl Acetate Monomer']
    },
    {
      mainName: 'Zinc Acetate',
      aliases: ['Zinc Diacetate, Dihydrate']
    },
    {
      mainName: 'Zinc Metal',
      aliases: ['Zin', 'Zinc Metal Sheets', 'Zinc Metal Shot', 'Zinc Metal Strips']
    }
  ];

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
    const searchNames = this.getAllRelatedNames(chemicalName);
    console.log('All related names:', searchNames);
    
    // First pass: exact matches
    for (const searchName of searchNames) {
      const chemical = allData.find((item: AllDataItem) => 
        item.type === 'chemical' && 
        item.name && this.normalizeForComparison(item.name) === this.normalizeForComparison(searchName)
      );
      
      if (chemical) {
        console.log('Found by exact name match:', chemical.name, 'for search name:', searchName);
        return chemical;
      }
    }

    // Second pass: normalized matches
    for (const searchName of searchNames) {
      const normalizedSearchName = this.normalizeChemicalName(searchName);
      console.log('Trying normalized search for:', normalizedSearchName);
      
      const chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        
        const itemName = this.normalizeChemicalName(item.name || '');
        const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
        
        return itemName === normalizedSearchName || itemId === normalizedSearchName;
      });

      if (chemical) {
        console.log('Found by normalized name:', chemical.name, 'for search name:', searchName);
        return chemical;
      }
    }

    // Third pass: partial matching
    for (const searchName of searchNames) {
      const chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        const itemName = item.name || '';
        const searchParts = searchName.toLowerCase().split(/[\s,\[\]\.]+/).filter(part => part.length > 2);
        const itemParts = itemName.toLowerCase().split(/[\s,\[\]\.]+/).filter(part => part.length > 2);
        
        const matchingParts = searchParts.filter(searchPart => 
          itemParts.some(itemPart => itemPart.includes(searchPart) || searchPart.includes(itemPart))
        );
        return matchingParts.length >= Math.ceil(searchParts.length * 0.7);
      });

      if (chemical) {
        console.log('Found by partial matching:', chemical.name, 'for search name:', searchName);
        return chemical;
      }
    }

    console.log('No chemical data found for any related names');
    return null;
  }

  private getAllRelatedNames(chemicalName: string): string[] {
    const relatedNames = new Set<string>();
    relatedNames.add(chemicalName);

    // Normalize the input name for better matching
    const normalizedInput = this.normalizeForComparison(chemicalName);

    // Find exact relationship matches
    const relationship = this.chemicalRelationships.find(rel => 
      this.normalizeForComparison(rel.mainName) === normalizedInput ||
      rel.aliases.some(alias => this.normalizeForComparison(alias) === normalizedInput)
    );

    if (relationship) {
      relatedNames.add(relationship.mainName);
      relationship.aliases.forEach(alias => relatedNames.add(alias));
    }

    // Add common variations for the input name
    this.addCommonVariations(chemicalName, relatedNames);

    return Array.from(relatedNames);
  }

  private normalizeForComparison(name: string): string {
    return name
      .toLowerCase()
      .replace(/[,\s]+/g, '') // Remove commas and spaces
      .replace(/\.\./g, '')   // Remove double dots
      .replace(/[\[\]()]/g, '') // Remove brackets and parentheses
      .trim();
  }

  private addCommonVariations(chemicalName: string, relatedNames: Set<string>) {
    // Add variations with different punctuation and spacing
    const variations = [
      chemicalName.replace(/,/g, ''),  // Remove commas
      chemicalName.replace(/\s*,\s*/g, ','), // Normalize comma spacing
      chemicalName.replace(/\s+/g, ''), // Remove all spaces
      chemicalName.replace(/\.\./g, ', '), // Replace .. with comma space
      chemicalName.replace(/\.\./g, ' '), // Replace .. with space
    ];

    variations.forEach(variation => {
      if (variation !== chemicalName && variation.trim().length > 0) {
        relatedNames.add(variation.trim());
      }
    });
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