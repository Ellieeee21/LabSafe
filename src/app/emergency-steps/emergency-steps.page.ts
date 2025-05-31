import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DatabaseService, AllDataItem } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-emergency-steps',
  templateUrl: './emergency-steps.page.html',
  styleUrls: ['./emergency-steps.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon
  ]
})
export class EmergencyStepsPage implements OnInit, OnDestroy {
  emergencyType: string = '';
  emergencyId: string = '';
  chemicalId: string = '';
  chemicalName: string = '';
  steps: string[] = [];
  hasData: boolean = false;
  isLoading: boolean = true;
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();

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
        this.steps = this.databaseService.getEmergencyStepsForChemical(this.chemicalId);
        console.log(`Emergency steps for chemical ${this.chemicalId}:`, this.steps);
      } else {
        // Get all emergency steps/procedures
        this.steps = this.databaseService.getAllEmergencySteps();
        console.log('All emergency steps:', this.steps);
      }
      
      this.hasData = this.steps.length > 0;
      
      // Fallback: if no data found but we have chemical data, try to extract manually
      if (!this.hasData && this.chemicalId) {
        this.fallbackEmergencyStepsExtraction();
      }
      
    } catch (error) {
      console.error('Error loading emergency steps:', error);
      this.hasData = false;
      this.steps = [];
    } finally {
      this.isLoading = false;
    }
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
        
        // Extract emergency information directly
        const emergencySteps: string[] = [];
        const data = chemical.data;
        
        // Check for emergency-related properties
        const emergencyProps = [
          'id#hasAccidentalGeneral',
          'id#hasFirstAidGeneral',
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
          this.steps = emergencySteps;
          this.hasData = true;
          console.log('Fallback extraction successful:', this.steps);
        }
      }
    }).unsubscribe(); // Unsubscribe immediately since we only need the current value
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