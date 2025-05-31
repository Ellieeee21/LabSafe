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
  IonSearchbar
} from '@ionic/angular/standalone';

interface StepGroup {
  category: string;
  steps: string[];
}

@Component({
  selector: 'app-emergency-steps',
  templateUrl: './emergency-steps.page.html',
  styleUrls: ['./emergency-steps.page.scss'],
  standalone: true,
  imports: [
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
  emergencyType: string = '';
  emergencyId: string = '';
  chemicalId: string = '';
  chemicalName: string = '';
  searchQuery: string = '';
  allStepGroups: StepGroup[] = [];
  filteredSteps: StepGroup[] = [];
  hasData: boolean = false;
  isLoading: boolean = true;
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();

  // Emergency type numbering system
  private emergencyTypeNumbers: { [key: string]: number } = {
    'Eye Contact': 1,
    'Fire Fighting': 2,
    'Flammability': 3,
    'Ingestion': 4,
    'Inhalation': 5,
    'Instability or Reactivity': 6,
    'Skin Contact': 7,
    'Spill': 8
  };

  // Main emergency types that should show numbers
  private mainEmergencyTypes = [
    'Eye Contact', 'Fire Fighting', 'Flammability', 'Ingestion', 
    'Inhalation', 'Instability or Reactivity', 'Skin Contact', 'Spill'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      this.chemicalId = params['chemicalId'] || '';
      this.chemicalName = params['chemicalName'] || '';
      
      this.loadEmergencySteps();
    });

    // Handle Android back button
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.goBack();
    });

    // Subscribe to database loading state
    this.dataSubscription = this.databaseService.allData$.subscribe(data => {
      if (data && data.length > 0) {
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
      if (this.chemicalId) {
        // Get steps specific to the selected chemical
        this.loadChemicalSpecificSteps();
      } else if (this.emergencyType) {
        // Filter by specific emergency type
        this.loadEmergencyTypeSpecificSteps();
      } else {
        // Get all emergency steps/procedures
        this.loadAllEmergencySteps();
      }
      
    } catch (error) {
      console.error('Error loading emergency steps:', error);
      this.hasData = false;
      this.allStepGroups = [];
      this.filteredSteps = [];
    } finally {
      this.isLoading = false;
      this.applySearch();
    }
  }

  private loadChemicalSpecificSteps() {
    this.databaseService.allData$.subscribe(allData => {
      const chemical = allData.find((item: AllDataItem) => 
        item.type === 'chemical' && 
        (item.id === this.chemicalId || item.id === `id#${this.chemicalId}`)
      );
      
      if (chemical && chemical.data) {
        this.allStepGroups = this.extractChemicalSteps(chemical.data);
        
        // If we have a specific emergency type, filter by it
        if (this.emergencyType) {
          this.allStepGroups = this.filterByEmergencyType(this.allStepGroups);
        }
        
        this.hasData = this.allStepGroups.length > 0;
      }
    }).unsubscribe();
  }

  private loadEmergencyTypeSpecificSteps() {
    // When coming from emergency types page, show only that type's data
    this.databaseService.allData$.subscribe(allData => {
      const allSteps: StepGroup[] = [];
      
      // Get all chemicals and extract steps for the specific emergency type
      const chemicals = allData.filter((item: AllDataItem) => item.type === 'chemical');
      
      chemicals.forEach(chemical => {
        if (chemical.data) {
          const chemicalSteps = this.extractChemicalSteps(chemical.data);
          const filteredSteps = this.filterByEmergencyType(chemicalSteps);
          allSteps.push(...filteredSteps);
        }
      });
      
      this.allStepGroups = allSteps;
      this.hasData = this.allStepGroups.length > 0;
    }).unsubscribe();
  }

  private loadAllEmergencySteps() {
    this.databaseService.allData$.subscribe(allData => {
      const allSteps: StepGroup[] = [];
      
      const chemicals = allData.filter((item: AllDataItem) => item.type === 'chemical');
      
      chemicals.forEach(chemical => {
        if (chemical.data) {
          const chemicalSteps = this.extractChemicalSteps(chemical.data);
          allSteps.push(...chemicalSteps);
        }
      });
      
      this.allStepGroups = allSteps;
      this.hasData = this.allStepGroups.length > 0;
    }).unsubscribe();
  }

  private extractChemicalSteps(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    
    // Map emergency type categories
    const emergencyMapping: { [key: string]: string } = {
      'id#hasFirstAidEye': 'Eye Contact',
      'id#hasFireFighting': 'Fire Fighting',
      'id#hasFlammability': 'Flammability',
      'id#hasFirstAidIngestion': 'Ingestion',
      'id#hasFirstAidInhalation': 'Inhalation',
      'id#hasConditionsOfInstability': 'Instability or Reactivity',
      'id#hasFirstAidSkin': 'Skin Contact',
      'id#hasLargeSpill': 'Spill',
      'id#hasSmallSpill': 'Spill'
    };

    // General information categories
    const generalCategories = [
      'id#hasAccidentalGeneral',
      'id#hasHealthHazards',
      'id#hasPhysicalHazards',
      'id#hasStabilityInformation',
      'id#hasPolymerizationInformation'
    ];

    // Process emergency-specific data
    for (const [prop, categoryName] of Object.entries(emergencyMapping)) {
      if (data[prop]) {
        const steps = this.extractStepsFromProperty(data[prop]);
        if (steps.length > 0) {
          // Combine spill categories
          if (categoryName === 'Spill') {
            const existingSpill = stepGroups.find(sg => sg.category === 'Spill');
            if (existingSpill) {
              existingSpill.steps.push(...steps);
            } else {
              stepGroups.push({ category: categoryName, steps });
            }
          } else {
            stepGroups.push({ category: categoryName, steps });
          }
        }
      }
    }

    // Process general information
    const generalSteps: string[] = [];
    for (const prop of generalCategories) {
      if (data[prop]) {
        const steps = this.extractStepsFromProperty(data[prop]);
        generalSteps.push(...steps);
      }
    }

    if (generalSteps.length > 0) {
      const chemicalName = this.chemicalName || 'Chemical';
      stepGroups.push({ 
        category: `General ${chemicalName} Information`, 
        steps: generalSteps 
      });
    }

    return stepGroups;
  }

  private extractStepsFromProperty(property: any): string[] {
    const steps: string[] = [];
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        if (item && typeof item === 'object' && item['@id']) {
          steps.push(this.formatIdValue(item['@id']));
        } else if (typeof item === 'string') {
          steps.push(item);
        }
      });
    } else if (property && typeof property === 'object' && property['@id']) {
      steps.push(this.formatIdValue(property['@id']));
    } else if (typeof property === 'string') {
      steps.push(property);
    }
    
    return steps.filter(step => step.trim().length > 0);
  }

  private formatIdValue(id: string): string {
    return id
      .replace('id#', '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .trim();
  }

  private filterByEmergencyType(stepGroups: StepGroup[]): StepGroup[] {
    if (!this.emergencyType) return stepGroups;
    
    return stepGroups.filter(group => 
      group.category.toLowerCase().includes(this.emergencyType.toLowerCase()) ||
      this.emergencyType.toLowerCase().includes(group.category.toLowerCase())
    );
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

  shouldShowStepNumber(category: string): boolean {
    return this.mainEmergencyTypes.some(type => 
      category.toLowerCase().includes(type.toLowerCase()) ||
      type.toLowerCase().includes(category.toLowerCase())
    );
  }

  getEmergencyTypeNumber(category: string): number {
    for (const [type, number] of Object.entries(this.emergencyTypeNumbers)) {
      if (category.toLowerCase().includes(type.toLowerCase()) ||
          type.toLowerCase().includes(category.toLowerCase())) {
        return number;
      }
    }
    return 0;
  }

  goBack() {
    if (this.chemicalId) {
      // Navigate back to chemical list if we came from a chemical
      this.router.navigate(['/chemical-list']);
    } else {
      // Navigate back to emergency types page (home)
      this.router.navigate(['/emergency-types']);
    }
  }

  // Bottom Navigation Methods
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