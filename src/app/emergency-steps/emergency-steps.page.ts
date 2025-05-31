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

  // Blacklisted categories that should be excluded
  private blacklistedCategories = [
    'Stability Information',
    'Polymerization Information', 
    'Accidental Release',
    'General First Aid'
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

    // Subscribe to database loading state - using the working approach from old code
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
        // Get steps specific to the selected chemical - using working approach from old code
        const rawSteps = this.databaseService.getEmergencyStepsForChemical(this.chemicalId);
        console.log(`Emergency steps for chemical ${this.chemicalId}:`, rawSteps);
        
        // Convert raw steps to grouped format
        this.allStepGroups = this.convertRawStepsToGroups(rawSteps);
        
        // Fallback: if no data found, try manual extraction like the old code
        if (this.allStepGroups.length === 0) {
          this.fallbackEmergencyStepsExtraction();
        }
      } else if (this.emergencyType) {
        // Filter by specific emergency type
        this.loadEmergencyTypeSpecificSteps();
      } else {
        // Get all emergency steps/procedures
        const rawSteps = this.databaseService.getAllEmergencySteps();
        console.log('All emergency steps:', rawSteps);
        this.allStepGroups = this.convertRawStepsToGroups(rawSteps);
      }
      
      // Apply blacklist filter and remove duplicates
      this.allStepGroups = this.filterBlacklistedCategories(this.allStepGroups);
      this.allStepGroups = this.removeDuplicateSteps(this.allStepGroups);
      
      this.hasData = this.allStepGroups.length > 0;
      
    } catch (error) {
      console.error('Error loading emergency steps:', error);
      this.hasData = false;
      this.allStepGroups = [];
    } finally {
      this.isLoading = false;
      this.applySearch();
    }
  }

  private filterBlacklistedCategories(stepGroups: StepGroup[]): StepGroup[] {
    return stepGroups.filter(group => {
      return !this.blacklistedCategories.some(blacklisted => 
        group.category.toLowerCase().includes(blacklisted.toLowerCase()) ||
        blacklisted.toLowerCase().includes(group.category.toLowerCase())
      );
    });
  }

  private removeDuplicateSteps(stepGroups: StepGroup[]): StepGroup[] {
    const processedGroups: StepGroup[] = [];
    const allSeenSteps = new Set<string>();

    stepGroups.forEach(group => {
      const uniqueSteps: string[] = [];
      
      group.steps.forEach(step => {
        const normalizedStep = step.toLowerCase().trim();
        if (!allSeenSteps.has(normalizedStep)) {
          allSeenSteps.add(normalizedStep);
          uniqueSteps.push(step);
        }
      });

      if (uniqueSteps.length > 0) {
        processedGroups.push({
          category: group.category,
          steps: uniqueSteps
        });
      }
    });

    return processedGroups;
  }

  private fallbackEmergencyStepsExtraction() {
    // Subscribe to get the current value instead of accessing .value directly
    this.databaseService.allData$.subscribe(allData => {
      const chemical = allData.find((item: AllDataItem) => 
        item.type === 'chemical' && 
        (item.id === this.chemicalId || item.id === `id#${this.chemicalId}`)
      );
      
      if (chemical && chemical.data) {
        console.log('Found chemical data for fallback:', chemical);
        
        // Extract emergency information directly using old code approach
        const emergencySteps: string[] = [];
        const data = chemical.data;
        
        // Check for emergency-related properties (excluding blacklisted ones)
        const emergencyProps = [
          'id#hasFirstAidEye',
          'id#hasFirstAidIngestion',
          'id#hasFirstAidInhalation',
          'id#hasFirstAidSkin',
          'id#hasLargeSpill',
          'id#hasSmallSpill',
          'id#hasConditionsOfInstability',
          'id#hasHealthHazards',
          'id#hasPhysicalHazards',
          'id#hasIncompatibilityIssuesWith'
          // Removed: 'id#hasAccidentalGeneral', 'id#hasFirstAidGeneral'
        ];
        
        for (const prop of emergencyProps) {
          if (data[prop]) {
            const categoryName = this.formatPropertyName(prop);
            const values = Array.isArray(data[prop]) ? data[prop] : [data[prop]];
            
            const formattedValues = values.map((val: any) => {
              if (val && val['@id']) {
                return this.formatIdValue(val['@id']);
              }
              return val;
            }).filter((val: any) => val);
            
            if (formattedValues.length > 0) {
              emergencySteps.push(`${categoryName}: ${formattedValues.join(', ')}`);
            }
          }
        }
        
        if (emergencySteps.length > 0) {
          this.allStepGroups = this.convertRawStepsToGroups(emergencySteps);
          this.hasData = true;
          console.log('Fallback extraction successful:', this.allStepGroups);
        }
      }
    }).unsubscribe(); // Unsubscribe immediately since we only need the current value
  }

  private convertRawStepsToGroups(rawSteps: string[]): StepGroup[] {
    const groups: StepGroup[] = [];
    
    rawSteps.forEach(step => {
      if (step.includes(':')) {
        const [category, content] = step.split(':', 2);
        const trimmedCategory = category.trim();
        const trimmedContent = content.trim();
        
        let existingGroup = groups.find(g => g.category === trimmedCategory);
        if (!existingGroup) {
          existingGroup = { category: trimmedCategory, steps: [] };
          groups.push(existingGroup);
        }
        existingGroup.steps.push(trimmedContent);
      } else {
        // If no category separator, put in General category
        let generalGroup = groups.find(g => g.category === 'General');
        if (!generalGroup) {
          generalGroup = { category: 'General', steps: [] };
          groups.push(generalGroup);
        }
        generalGroup.steps.push(step);
      }
    });
    
    return groups;
  }

  private loadEmergencyTypeSpecificSteps() {
    this.databaseService.allData$.subscribe(allData => {
      const allSteps: StepGroup[] = [];
      const uniqueSteps = new Set<string>();
      
      const chemicals = allData.filter((item: AllDataItem) => item.type === 'chemical');
      
      chemicals.forEach(chemical => {
        if (chemical.data) {
          const chemicalSteps = this.extractChemicalSteps(chemical.data);
          const filteredSteps = this.filterByEmergencyType(chemicalSteps);
          
          filteredSteps.forEach(stepGroup => {
            stepGroup.steps.forEach(step => {
              if (!uniqueSteps.has(step)) {
                uniqueSteps.add(step);
                let existingGroup = allSteps.find(sg => sg.category === stepGroup.category);
                if (!existingGroup) {
                  existingGroup = { category: stepGroup.category, steps: [] };
                  allSteps.push(existingGroup);
                }
                existingGroup.steps.push(step);
              }
            });
          });
        }
      });
      
      this.allStepGroups = allSteps;
      this.hasData = this.allStepGroups.length > 0;
    }).unsubscribe();
  }

  private extractChemicalSteps(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    
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

    const generalCategories = [
      'id#hasHealthHazards',
      'id#hasPhysicalHazards'
      // Removed blacklisted categories from general processing
    ];

    for (const [prop, categoryName] of Object.entries(emergencyMapping)) {
      if (data[prop]) {
        const steps = this.extractStepsFromProperty(data[prop]);
        if (steps.length > 0) {
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

  private formatPropertyName(prop: string): string {
    return prop
      .replace('id#has', '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
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

  goBack() {
    if (this.chemicalId) {
      this.router.navigate(['/chemical-list']);
    } else {
      this.router.navigate(['/emergency-types']);
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