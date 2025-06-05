import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical, AllDataItem } from '../services/database.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline, searchOutline, chevronForwardOutline, refreshOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-chemical-list',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ChemicalListPage implements OnInit, OnDestroy {
  searchTerm: string = '';
  chemicals: Chemical[] = [];
  filteredChemicals: Chemical[] = [];
  isLoading = true;
  emergencyType: string = '';
  emergencyId: string = '';
  
  isEmergencyMode: boolean = false;
  
  private subscription: Subscription = new Subscription();
  private routeSubscription: Subscription = new Subscription();

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
    private databaseService: DatabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({ 
      homeOutline, flaskOutline, timeOutline, personOutline, searchOutline, chevronForwardOutline, refreshOutline
    });
  }

  async ngOnInit() {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      this.isEmergencyMode = !!(this.emergencyType || this.emergencyId);
      
      console.log('Emergency Type:', this.emergencyType);
      console.log('Emergency ID:', this.emergencyId);
      console.log('Emergency Mode:', this.isEmergencyMode);
    });

    await this.loadChemicals();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  async loadChemicals() {
    try {
      this.isLoading = true;
      
      this.subscription = this.databaseService.chemicals$.subscribe(chemicals => {
        console.log('Chemicals loaded:', chemicals.length);
        this.chemicals = chemicals;
        this.filterChemicalsByDataAvailability();
        this.applySearch();
        this.isLoading = false;
      });
      
    } catch (error) {
      console.error('Error loading chemicals:', error);
      this.chemicals = [];
      this.filteredChemicals = [];
      this.isLoading = false;
    }
  }

  private filterChemicalsByDataAvailability() {
    const allData = this.databaseService.getCurrentAllData();
    
    if (!allData || allData.length === 0) {
      this.chemicals = [];
      return;
    }

    if (this.isEmergencyMode) {
      // Filter chemicals that have emergency data
      this.chemicals = this.chemicals.filter(chemical => 
        this.hasEmergencyData(chemical, allData)
      );
      console.log('Filtered chemicals with emergency data:', this.chemicals.length);
    } else {
      // Filter chemicals that have chemical details data
      this.chemicals = this.chemicals.filter(chemical => 
        this.hasChemicalDetailsData(chemical, allData)
      );
      console.log('Filtered chemicals with details data:', this.chemicals.length);
    }
  }

  private hasEmergencyData(chemical: Chemical, allData: AllDataItem[]): boolean {
    const chemicalData = this.findChemicalData(allData, chemical.name);
    
    if (!chemicalData || !chemicalData.data) {
      return false;
    }

    const data = chemicalData.data;
    
    // Check for emergency properties
    const emergencyProperties = [
      'id#hasFirstAidEye', 'hasFirstAidEye',
      'id#hasFirstAidIngestion', 'hasFirstAidIngestion',
      'id#hasFirstAidInhalation', 'hasFirstAidInhalation',
      'id#hasFirstAidSkin', 'hasFirstAidSkin',
      'id#hasFirstAidSeriousInhalation', 'hasFirstAidSeriousInhalation',
      'id#hasFirstAidSeriousSkin', 'hasFirstAidSeriousSkin',
      'id#hasFirstAidGeneral', 'hasFirstAidGeneral',
      'id#hasSmallSpill', 'hasSmallSpill',
      'id#hasLargeSpill', 'hasLargeSpill',
      'id#hasSmallFireFighting', 'hasSmallFireFighting',
      'id#hasLargeFireFighting', 'hasLargeFireFighting',
      'id#hasConditionsOfInstability', 'hasConditionsOfInstability',
      'id#hasAccidentalGeneral', 'hasAccidentalGeneral'
    ];
    
    return emergencyProperties.some(prop => data[prop]);
  }

  private hasChemicalDetailsData(chemical: Chemical, allData: AllDataItem[]): boolean {
    const chemicalData = this.findChemicalData(allData, chemical.name);
    
    if (!chemicalData || !chemicalData.data) {
      return false;
    }

    const data = chemicalData.data;
    
    // Check for chemical details properties
    const detailsProperties = [
      'id#hasHealthLevel', 'hasHealthLevel',
      'id#hasFlammabilityLevel', 'hasFlammabilityLevel',
      'id#hasInstabilityOrReactivityLevel', 'hasInstabilityOrReactivityLevel',
      'id#hasPhysicalHazards', 'hasPhysicalHazards',
      'id#hasHealthHazards', 'hasHealthHazards',
      'id#hasStabilityAtNormalConditions', 'hasStabilityAtNormalConditions',
      'id#hasConditionsOfInstability', 'hasConditionsOfInstability',
      'id#hasIncompatibilityIssuesWith', 'hasIncompatibilityIssuesWith',
      'id#hasReactivityWith', 'hasReactivityWith',
      'id#hasPolymerization', 'hasPolymerization'
    ];
    
    return detailsProperties.some(prop => data[prop]);
  }

  private findChemicalData(allData: AllDataItem[], chemicalName: string): AllDataItem | null {
    console.log('Looking for chemical with name:', chemicalName);

    // First, try to find by exact name match
    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      item.name && item.name.toLowerCase() === chemicalName.toLowerCase()
    );

    if (chemical) {
      console.log('Found by exact name match:', chemical.name);
      return this.resolveChemicalReference(chemical, allData);
    }

    // Try using aliases
    const allPossibleNames = this.getAllPossibleNamesForChemical(chemicalName);
    console.log('All possible names for', chemicalName, ':', allPossibleNames);
    
    for (const possibleName of allPossibleNames) {
      chemical = allData.find((item: AllDataItem) => 
        item.type === 'chemical' && 
        item.name && item.name.toLowerCase() === possibleName.toLowerCase()
      );

      if (chemical) {
        console.log('Found by alias match:', chemical.name, 'using alias:', possibleName);
        return this.resolveChemicalReference(chemical, allData);
      }
    }

    // Try normalized name matching
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
        return this.resolveChemicalReference(chemical, allData);
      }
    }

    console.log('No chemical data found for:', chemicalName);
    return null;
  }

  /**
   * Resolves owl:sameAs references to find the chemical with actual data
   */
  private resolveChemicalReference(chemical: AllDataItem, allData: AllDataItem[]): AllDataItem {
    console.log('Resolving chemical reference for:', chemical.name);
    
    // Check if this chemical has any relevant data
    if (this.hasAnyRelevantData(chemical.data)) {
      console.log('Chemical has direct relevant data');
      return chemical;
    }

    // Check for owl:sameAs relationships
    const sameAsProperty = 'http://www.w3.org/2002/07/owl#sameAs';
    if (chemical.data && chemical.data[sameAsProperty]) {
      console.log('Found sameAs relationship:', chemical.data[sameAsProperty]);
      
      const sameAsRefs = Array.isArray(chemical.data[sameAsProperty]) 
        ? chemical.data[sameAsProperty] 
        : [chemical.data[sameAsProperty]];
      
      for (const ref of sameAsRefs) {
        let refId = '';
        
        if (typeof ref === 'string') {
          refId = ref;
        } else if (ref && ref['@id']) {
          refId = ref['@id'];
        }
        
        if (refId) {
          console.log('Looking for referenced chemical:', refId);
          
          // Find the referenced chemical
          const referencedChemical = allData.find(item => 
            item.type === 'chemical' && 
            (item.id === refId || item.id === refId.replace('id#', ''))
          );
          
          if (referencedChemical && this.hasAnyRelevantData(referencedChemical.data)) {
            console.log('Found referenced chemical with relevant data:', referencedChemical.name);
            return referencedChemical;
          }
        }
      }
    }

    console.log('No chemical with relevant data found, returning original');
    return chemical;
  }

  private hasAnyRelevantData(data: any): boolean {
    if (!data) return false;
    
    const allRelevantProperties = [
      // Emergency properties
      'id#hasFirstAidEye', 'hasFirstAidEye',
      'id#hasFirstAidIngestion', 'hasFirstAidIngestion',
      'id#hasFirstAidInhalation', 'hasFirstAidInhalation',
      'id#hasFirstAidSkin', 'hasFirstAidSkin',
      'id#hasFirstAidSeriousInhalation', 'hasFirstAidSeriousInhalation',
      'id#hasFirstAidSeriousSkin', 'hasFirstAidSeriousSkin',
      'id#hasFirstAidGeneral', 'hasFirstAidGeneral',
      'id#hasSmallSpill', 'hasSmallSpill',
      'id#hasLargeSpill', 'hasLargeSpill',
      'id#hasSmallFireFighting', 'hasSmallFireFighting',
      'id#hasLargeFireFighting', 'hasLargeFireFighting',
      'id#hasAccidentalGeneral', 'hasAccidentalGeneral',
      // Chemical details properties
      'id#hasHealthLevel', 'hasHealthLevel',
      'id#hasFlammabilityLevel', 'hasFlammabilityLevel',
      'id#hasInstabilityOrReactivityLevel', 'hasInstabilityOrReactivityLevel',
      'id#hasPhysicalHazards', 'hasPhysicalHazards',
      'id#hasHealthHazards', 'hasHealthHazards',
      'id#hasStabilityAtNormalConditions', 'hasStabilityAtNormalConditions',
      'id#hasConditionsOfInstability', 'hasConditionsOfInstability',
      'id#hasIncompatibilityIssuesWith', 'hasIncompatibilityIssuesWith',
      'id#hasReactivityWith', 'hasReactivityWith',
      'id#hasPolymerization', 'hasPolymerization'
    ];
    
    return allRelevantProperties.some(prop => data[prop]);
  }

  private getAllPossibleNamesForChemical(chemicalName: string): string[] {
    const allNames = new Set<string>();
    allNames.add(chemicalName);
    
    // Add direct aliases
    const directAliases = this.chemicalAliases[chemicalName] || [];
    directAliases.forEach(alias => allNames.add(alias));

    // Check if this chemical is an alias of another main chemical
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
      allNames.add(parts[0]);
      if (parts[1]) allNames.add(parts[1]);
    }

    // Handle parentheses and brackets
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

    // Handle double dots
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

  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.searchTerm = query;
    this.applySearch();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applySearch();
  }

  private applySearch() {
    if (!this.searchTerm) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(this.searchTerm) ||
        (chemical.formula && chemical.formula.toLowerCase().includes(this.searchTerm)) ||
        (chemical.casNumber && chemical.casNumber.toLowerCase().includes(this.searchTerm))
      );
    }
  }

  onChemicalClick(chemical: Chemical) {
    if (this.isEmergencyMode) {
      this.navigateToEmergencySteps(chemical);
    } else {
      this.navigateToChemicalDetails(chemical);
    }
  }

  navigateToChemicalDetails(chemical: Chemical) {
    console.log('Navigating to chemical details for:', chemical.name);
    this.router.navigate(['/chemical-details', chemical.id]);
  }

  navigateToEmergencySteps(chemical: Chemical) {
    console.log('Navigating to emergency steps for chemical:', chemical.name);
    
    const queryParams: any = {
      chemicalId: chemical.id.toString(),
      chemicalName: chemical.name
    };
    
    if (this.emergencyType) {
      queryParams.emergencyType = this.emergencyType;
    }
    if (this.emergencyId) {
      queryParams.emergencyId = this.emergencyId;
    }
    
    this.router.navigate(['/emergency-steps'], { 
      queryParams 
    });
  }

  async reloadFromJsonLd() {
    try {
      this.isLoading = true;
      await this.databaseService.reloadDatabase();
      console.log('Database reloaded successfully');
    } catch (error) {
      console.error('Error reloading database:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get displayedChemicals(): Chemical[] {
    return this.filteredChemicals;
  }

  // Bottom Navigation Methods
  navigateToHome() {
    console.log('Navigating to emergency types...');
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    console.log('Navigating to chemicals (clearing emergency mode)...');
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
}