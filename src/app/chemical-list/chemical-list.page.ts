import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical } from '../services/database.service';
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

  private chemicalAliases: { [key: string]: string[] } = {
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
    'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
    '3,5-Dinitrosalicylic Acid': ['2-hydroxy-3,5-dinitrobenzoic Acid'],
    '1,2,3-Benzenetriol': ['Pyrogallic Acid', '1,2,3-Trihydroxybenzene'],
    '1,2,3-Propanetriol': ['Glycerin'],
    '1,2-Benzenedicarboxylic Acid Monopotassium Salt': ['Potassium Bitphthlate', 'Pthalic Acid Monopotassium Salt'],
    '2,2\'-Oxydiethanol': ['Diethylene Glycol', 'Carbitol'],
    '2,4,6-Triamino-s-Triazine': ['Melamine'],
    '2-Amino-2-(hydroxymethyl)propane-1,3-diol Hydrochloride': ['Tris(hydroxymethyl)methylamine'],
    '2-Furan Percarboxylic Acid': [],
    '2-Hydroxy-1,2,3-propanetricarboxylic Acid': ['Citric Acid'],
    '2-hydroxy-3,5-dinitrobenzoic Acid': ['3,5-Dinitrosalicylic Acid'],
    '2-Hydroxybenzoic Acid': ['Salicylic Acid'],
    'ABL': ['Lauric Acid', 'Dodecanoic Acid', 'Dodecylic Acid', 'Laurostearic Acid', 'Neo-fat12', 'Neo-fat12-43', 'Vulvic Acid', 'n-Dodecanoic Acid'],
    'Absolute Ethanol': ['Ethyl Alcohol (200 Proof)', 'Anhydrous Ethyl Alcohol'],
    'Acetic Acid': ['Glacial Acetic Acid', 'Acetic Acid,Ethyl Ester', 'Ethyl Acetate', 'Acetoxyethane'],
    'AceticAcid..EthylEster': ['Acetic Acid', 'Ethyl Ester', 'Ethyl Acetate', 'Acetoxyethane'],
    'Alpha-alumina': ['Aluminum Oxide', 'Aluminia', 'Aluminum Oxide Powder'],
    'Ametox': ['Antichlor', 'Sodium Thiosulfate Pentahydrate'],
    'Ammonium Chloratum': ['Ammonium Chloride', 'Ammonium Chloridum', 'Ammonium Muriate', 'Sal Ammonia', 'Salmiac'],
    'Ammonium Hydroxide': ['Aqueous Ammonia', 'Strong Ammonia Solution', 'Stronger Ammonia Water'],
    'Ammonium Iron (II) Sulfate, Hexahydrate': ['Di-ammonium (II) Sulfate Hexahydrate', 'Ferrous Ammonium Sulfate Hexahydrate'],
    'Ammonium Nitrate': ['Ammonium Salt with Nitric Acid', 'Ammonium Saltpeter'],
    'Ammonium Sulfate': ['Diammonium Salt with Sulfuric Acid'],
    'Anilinobenzene': ['Diphenylamine'],
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
    'Copper (II) Sulfate Pentahydrate': ['Copper Sulfate Pentahydrate'],
    'Cupric Chloride Dihydrate': ['Copper Chloride Dihydrate', 'Coppertrace'],
    'Cupric Oxide': ['Copper (II) Oxide'],
    'D-Glucose': ['Dextrose (Anhydrous)', 'Dextrose'],
    'Di-phosphorus Pentoxide': ['Phosphorus Pentoxide'],
    'Ferrous Sulfate': ['Ferrous Sulfate Dried Powder', 'Ferrous Sulfate Hydrate'],
    'Formaldehyde (37% Solution)': ['Formalin'],
    'Formic Acid (85%)': ['FormicAcid, 85Percent, F.C.C'],
    'Hydrogen Potassium Pthalate': ['Potassium Bitphthlate'],
    'Hydrogen Sulfite Sodium': ['Sodium Bisulfite'],
    'Kaolin Colloidal Powder': ['Kaolin Powder'],
    'Oxalic Acid': ['Oxalic Acid (Anhydrous)'],
    'Phosphorus Pentoxide': ['Di-phosphorus Pentoxide'],
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

  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.searchTerm = query;
    this.applySearch();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applySearch();
  }

  private getAllRelatedChemicalNames(searchName: string): string[] {
    const relatedNames: string[] = [searchName];
    
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      const allNamesInGroup = [mainName, ...aliases];
      
      if (allNamesInGroup.some(name => 
        name.toLowerCase() === searchName.toLowerCase()
      )) {
        allNamesInGroup.forEach(name => {
          if (!relatedNames.some(existing => 
            existing.toLowerCase() === name.toLowerCase()
          )) {
            relatedNames.push(name);
          }
        });
        break;
      }
    }
    
    return relatedNames;
  }

  private applySearch() {
    if (!this.searchTerm) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      
      this.filteredChemicals = this.chemicals.filter(chemical => {
        // Check main chemical properties
        const matchesMain = chemical.name.toLowerCase().includes(searchTermLower) ||
          (chemical.formula && chemical.formula.toLowerCase().includes(searchTermLower)) ||
          (chemical.casNumber && chemical.casNumber.toLowerCase().includes(searchTermLower));
        
        if (matchesMain) return true;
        
        // Check if the chemical name has aliases that match the search term
        const relatedNames = this.getAllRelatedChemicalNames(chemical.name);
        return relatedNames.some(relatedName => 
          relatedName.toLowerCase().includes(searchTermLower)
        );
      });
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