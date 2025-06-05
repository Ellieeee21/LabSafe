import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DatabaseService, AllDataItem } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSearchbar, IonSpinner, IonButton } from '@ionic/angular/standalone';

interface StepGroup {
  category: string;
  steps: string[];
}

@Component({
  selector: 'app-emergency-steps',
  templateUrl: './emergency-steps.page.html',
  styleUrls: ['./emergency-steps.page.scss'],
  standalone: true,
  imports: [IonSpinner, 
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonSearchbar
  ]
})
export class EmergencyStepsPage implements OnInit, OnDestroy {
  chemicalId: string = '';
  chemicalName: string = '';
  emergencyType: string = '';
  emergencyId: string = '';
  searchQuery: string = '';
  allStepGroups: StepGroup[] = [];
  filteredSteps: StepGroup[] = [];
  hasData: boolean = false;
  isLoading: boolean = true;
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();

  // Comprehensive chemical aliases mapping - updated with all relationships
  private chemicalAliases: { [key: string]: string[] } = {
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
    'Acetic Acid': ['Glacial Acetic Acid', 'Acetic Acid,Ethyl Ester', 'AceticAcid..EthylEster', 'Ethyl Acetate', 'Acetoxyethane'],
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
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
    'Phenolphthalien (0.5% in 50% Isopropanol)': [],
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

  private emergencyTypeMapping: { [key: string]: string[] } = {
    'Eye Contact': ['id#hasFirstAidEye', 'hasFirstAidEye'],
    'Fire Fighting': ['id#hasSmallFireFighting', 'hasSmallFireFighting', 'id#hasLargeFireFighting', 'hasLargeFireFighting'],
    'Ingestion': ['id#hasFirstAidIngestion', 'hasFirstAidIngestion'],
    'Inhalation': ['id#hasFirstAidInhalation', 'hasFirstAidInhalation', 'id#hasFirstAidSeriousInhalation', 'hasFirstAidSeriousInhalation'],
    'Skin Contact': ['id#hasFirstAidSkin', 'hasFirstAidSkin', 'id#hasFirstAidSeriousSkin', 'hasFirstAidSeriousSkin'],
    'Spill': ['id#hasSmallSpill', 'hasSmallSpill', 'id#hasLargeSpill', 'hasLargeSpill', 'id#hasAccidentalGeneral', 'hasAccidentalGeneral']
  };

  private accidentalGeneralSteps = [
    'Absorb with Inert Dry Material',
    'Call for Assistance of Disposal',
    'Keep Away from Ignition or Heat',
    'Never Touch',
    'Prevent Entry to Basements',
    'Prevent Entry to Confined Areas',
    'Prevent Entry to Sewers',
    'Prevent Water Inside Container',
    'Stop leak if safe',
    'Water spray to dampen',
    'Absorb with Inert Dry Material',
    'Dilute with Water and Dispose According to Authority Requirements',
    'Place in Appropriate Disposal'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.chemicalId = params['chemicalId'] || '';
      this.chemicalName = params['chemicalName'] || '';
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      
      console.log('Chemical ID:', this.chemicalId);
      console.log('Chemical Name:', this.chemicalName);
      console.log('Emergency Type:', this.emergencyType);
      console.log('Emergency ID:', this.emergencyId);
      
      this.loadEmergencySteps();
    });

    // Handle Android back button
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.goBack();
    });

    // Subscribe to database loading state
    this.dataSubscription = this.databaseService.allData$.subscribe(data => {
      if (data && data.length > 0) {
        console.log('Database data received, reloading steps');
        this.loadEmergencySteps();
      }
    });
  }

  ngOnDestroy() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  private loadEmergencySteps() {
    this.isLoading = true;
    
    try {
      const allData = this.databaseService.getCurrentAllData();
      console.log('All data length:', allData.length);
      
      if (allData && allData.length > 0) {
        const chemical = this.findChemicalData(allData);
        console.log('Found chemical:', chemical);
        
        if (chemical && chemical.data) {
          console.log('Chemical data keys:', Object.keys(chemical.data));
          this.allStepGroups = this.extractEmergencyProcedures(chemical.data);
          this.hasData = this.allStepGroups.length > 0;
          console.log('Extracted step groups:', this.allStepGroups.length);
          console.log('Step groups:', this.allStepGroups);
        } else {
          this.hasData = false;
          this.allStepGroups = [];
          console.log('No chemical data found');
        }
      } else {
        this.hasData = false;
        this.allStepGroups = [];
        console.log('No database data available');
      }
      
      this.isLoading = false;
      this.applySearch();
      
    } catch (error) {
      console.error('Error loading emergency steps:', error);
      this.hasData = false;
      this.allStepGroups = [];
      this.isLoading = false;
      this.applySearch();
    }
  }

  private findChemicalData(allData: AllDataItem[]): AllDataItem | null {
    console.log('Looking for chemical with ID:', this.chemicalId, 'Name:', this.chemicalName);
    
    // First try to find by exact ID match
    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      (item.id === this.chemicalId || item.id === `id#${this.chemicalId}`)
    );

    if (chemical) {
      console.log('Found by ID:', chemical.id);
      return chemical;
    }

    // If not found by ID, try to find by name or related chemicals
    if (this.chemicalName) {
      const possibleNames = this.getAllRelatedChemicalNames(this.chemicalName);
      console.log('Searching for possible names:', possibleNames);
      
      for (const searchName of possibleNames) {
        console.log('Trying search name:', searchName);
        
        // Try exact match first
        chemical = allData.find((item: AllDataItem) => {
          if (item.type !== 'chemical') return false;
          
          const itemName = item.name || '';
          const itemId = item.id?.replace('id#', '') || '';
          
          return itemName === searchName || itemId === searchName;
        });

        if (chemical) {
          console.log('Found chemical by exact name match:', chemical.name, 'for search term:', searchName);
          return chemical;
        }

        // Try normalized match if exact match fails
        const normalizedSearchName = this.normalizeChemicalName(searchName);
        console.log('Trying normalized name:', normalizedSearchName);
        
        chemical = allData.find((item: AllDataItem) => {
          if (item.type !== 'chemical') return false;
          
          const itemName = this.normalizeChemicalName(item.name || '');
          const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
          
          return itemName === normalizedSearchName || itemId === normalizedSearchName;
        });

        if (chemical) {
          console.log('Found chemical by normalized name:', chemical.name, 'for search term:', searchName);
          return chemical;
        }
      }
    }

    const chemicals = allData.filter(item => item.type === 'chemical');
    console.log('Available chemicals:', chemicals.map(c => ({ id: c.id, name: c.name })));

    return null;
  }

  /**
   * Get all possible names for a chemical including its aliases and chemicals that have it as an alias
   */
  private getAllRelatedChemicalNames(chemicalName: string): string[] {
    const relatedNames = new Set<string>();
    relatedNames.add(chemicalName);

    // Check if this chemical is a main chemical with aliases
    const normalizedInput = chemicalName.toLowerCase().trim();
    
    for (const [mainChemical, aliases] of Object.entries(this.chemicalAliases)) {
      // If the input matches the main chemical name
      if (mainChemical.toLowerCase() === normalizedInput) {
        relatedNames.add(mainChemical);
        aliases.forEach(alias => relatedNames.add(alias));
        break;
      }
      
      // If the input matches any of the aliases
      if (aliases.some(alias => alias.toLowerCase() === normalizedInput)) {
        relatedNames.add(mainChemical);
        aliases.forEach(alias => relatedNames.add(alias));
        break;
      }
    }

    console.log('Related chemical names for', chemicalName, ':', Array.from(relatedNames));
    return Array.from(relatedNames);
  }

  private normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w]/g, '')  // Keep alphanumeric characters only
      .trim();
  }

  private getMainChemicalName(name: string): string {
    const normalizedInput = name.toLowerCase().trim();
    
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (mainName.toLowerCase() === normalizedInput || 
          aliases.some(alias => alias.toLowerCase() === normalizedInput)) {
        return mainName;
      }
    }
    return name;
  }

  private extractEmergencyProcedures(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    console.log('Extracting emergency procedures for emergency type:', this.emergencyType);
    console.log('Extracting procedures from data:', Object.keys(data));
    
    if (!this.emergencyType) {
      return this.extractAllEmergencyProcedures(data);
    }

    const relevantProperties = this.emergencyTypeMapping[this.emergencyType];
    
    if (!relevantProperties) {
      console.log('No mapping found for emergency type:', this.emergencyType);
      return [];
    }

    console.log('Looking for properties:', relevantProperties);

    const emergencyMapping: { [key: string]: string } = {
      'id#hasFirstAidEye': 'Eye Contact First Aid',
      'hasFirstAidEye': 'Eye Contact First Aid',
      'id#hasFirstAidIngestion': 'Ingestion First Aid',
      'hasFirstAidIngestion': 'Ingestion First Aid',
      'id#hasFirstAidInhalation': 'Inhalation First Aid',
      'hasFirstAidInhalation': 'Inhalation First Aid',
      'id#hasFirstAidSkin': 'Skin Contact First Aid',
      'hasFirstAidSkin': 'Skin Contact First Aid',
      'id#hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'id#hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'id#hasFirstAidGeneral': 'General First Aid',
      'hasFirstAidGeneral': 'General First Aid',
      'id#hasSmallSpill': 'Small Spill Procedures',
      'hasSmallSpill': 'Small Spill Procedures',
      'id#hasLargeSpill': 'Large Spill Procedures',
      'hasLargeSpill': 'Large Spill Procedures',
      'id#hasSmallFireFighting': 'Small Fire Fighting',
      'hasSmallFireFighting': 'Small Fire Fighting',
      'id#hasLargeFireFighting': 'Large Fire Fighting',
      'hasLargeFireFighting': 'Large Fire Fighting',
      'id#hasConditionsOfInstability': 'Conditions of Instability',
      'hasConditionsOfInstability': 'Conditions of Instability',
      'id#hasAccidentalGeneral': 'General Accident Procedures',
      'hasAccidentalGeneral': 'General Accident Procedures'
    };

    for (const prop of relevantProperties) {
      if (data[prop] && emergencyMapping[prop]) {
        console.log(`Found property ${prop}:`, data[prop]);
        let steps: string[] = [];
        
        if (prop.includes('AccidentalGeneral')) {
          steps = this.accidentalGeneralSteps.map(step => `• ${step}`);
        } else {
          steps = this.extractStepsFromProperty(data[prop]);
        }
        
        if (steps.length > 0) {
          stepGroups.push({ 
            category: emergencyMapping[prop], 
            steps: steps
          });
        }
      }
    }

    console.log('Total emergency procedure groups extracted:', stepGroups.length);
    return stepGroups;
  }

  private extractAllEmergencyProcedures(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    console.log('Extracting all emergency procedures from data:', Object.keys(data));
    
    const emergencyMapping: { [key: string]: string } = {
      'id#hasFirstAidEye': 'Eye Contact First Aid',
      'hasFirstAidEye': 'Eye Contact First Aid',
      'id#hasFirstAidIngestion': 'Ingestion First Aid',
      'hasFirstAidIngestion': 'Ingestion First Aid',
      'id#hasFirstAidInhalation': 'Inhalation First Aid',
      'hasFirstAidInhalation': 'Inhalation First Aid',
      'id#hasFirstAidSkin': 'Skin Contact First Aid',
      'hasFirstAidSkin': 'Skin Contact First Aid',
      'id#hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'id#hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'id#hasFirstAidGeneral': 'General First Aid',
      'hasFirstAidGeneral': 'General First Aid',
      'id#hasSmallSpill': 'Small Spill Procedures',
      'hasSmallSpill': 'Small Spill Procedures',
      'id#hasLargeSpill': 'Large Spill Procedures',
      'hasLargeSpill': 'Large Spill Procedures',
      'id#hasSmallFireFighting': 'Small Fire Fighting',
      'hasSmallFireFighting': 'Small Fire Fighting',
      'id#hasLargeFireFighting': 'Large Fire Fighting',
      'hasLargeFireFighting': 'Large Fire Fighting',
      'id#hasConditionsOfInstability': 'Conditions of Instability',
      'hasConditionsOfInstability': 'Conditions of Instability',
      'id#hasAccidentalGeneral': 'General Accident Procedures',
      'hasAccidentalGeneral': 'General Accident Procedures'
    };

    for (const [prop, categoryName] of Object.entries(emergencyMapping)) {
      if (data[prop]) {
        console.log(`Found property ${prop}:`, data[prop]);
        let steps: string[] = [];
        
        if (prop.includes('AccidentalGeneral')) {
          steps = this.accidentalGeneralSteps.map(step => `• ${step}`);
        } else {
          steps = this.extractStepsFromProperty(data[prop]);
        }
        
        if (steps.length > 0) {
          stepGroups.push({ 
            category: categoryName, 
            steps: steps
          });
        }
      }
    }

    console.log('Total emergency procedure groups extracted:', stepGroups.length);
    return stepGroups;
  }

  private extractStepsFromProperty(property: any): string[] {
    const steps: string[] = [];
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        const stepText = this.extractSingleValue(item);
        if (stepText && stepText.trim().length > 0) {
          const cleanedText = this.cleanStepText(stepText);
          steps.push(`• ${cleanedText}`);
        }
      });
    } else {
      const stepText = this.extractSingleValue(property);
      if (stepText && stepText.trim().length > 0) {
        const cleanedText = this.cleanStepText(stepText);
        steps.push(`• ${cleanedText}`);
      }
    }
    
    return steps;
  }

  private cleanStepText(text: string): string {
    let cleaned = text.replace(/^Post\s+/i, '');
    cleaned = cleaned.replace(/Phys\s+Haz/gi, 'Physical Hazards');
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

  private formatIdValue(id: string): string {
    if (!id) return '';
    
    return id
      .replace('id#', '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .replace(/\.\./g, ', ')
      .trim();
  }

  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.searchQuery = query;
    this.applySearch();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applySearch();
  }

  private applySearch() {
    if (!this.searchQuery) {
      this.filteredSteps = [...this.allStepGroups];
    } else {
      this.filteredSteps = this.allStepGroups.filter(group =>
        group.category.toLowerCase().includes(this.searchQuery) ||
        group.steps.some(step => step.toLowerCase().includes(this.searchQuery))
      );
    }
  }

  goBack() {
    const queryParams: any = {};
    
    if (this.emergencyType) {
      queryParams.emergencyType = this.emergencyType;
    }
    if (this.emergencyId) {
      queryParams.emergencyId = this.emergencyId;
    }
    
    if (Object.keys(queryParams).length > 0) {
      this.router.navigate(['/chemical-list'], { queryParams });
    } else {
      this.router.navigate(['/chemical-list']);
    }
  }

  navigateToHome() {
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}