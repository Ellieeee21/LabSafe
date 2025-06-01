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
  IonButton,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  eyeOutline, flameOutline, warningOutline, waterOutline, 
  pulseOutline, shieldOutline, handLeftOutline, colorFillOutline,
  arrowBackOutline, homeOutline, flaskOutline, timeOutline, personOutline
} from 'ionicons/icons';

interface EmergencyType {
  key: string;
  label: string;
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
    IonButton,
    IonSpinner
  ]
})
export class EmergencyStepsPage implements OnInit, OnDestroy {
  chemicalId: string = '';
  chemicalName: string = '';
  hasData: boolean = false;
  isLoading: boolean = true;
  showSpecificEmergency: boolean = false;
  selectedEmergencyType: string = '';
  selectedEmergencyData: string[] = [];
  
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();
  private chemicalData: any = null;

  availableEmergencyTypes: EmergencyType[] = [
    { key: 'eyeContact', label: 'Eye Contact' },
    { key: 'fireFighting', label: 'Fire Fighting' },
    { key: 'flammability', label: 'Flammability' },
    { key: 'ingestion', label: 'Ingestion' },
    { key: 'inhalation', label: 'Inhalation' },
    { key: 'instability', label: 'Instability or Reactivity' },
    { key: 'skinContact', label: 'Skin Contact' },
    { key: 'spill', label: 'Spill' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private databaseService: DatabaseService
  ) {
    addIcons({ 
      eyeOutline, flameOutline, warningOutline, waterOutline,
      pulseOutline, shieldOutline, handLeftOutline, colorFillOutline,
      arrowBackOutline, homeOutline, flaskOutline, timeOutline, personOutline
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.chemicalId = params['chemicalId'] || '';
      this.chemicalName = params['chemicalName'] || '';
      
      this.loadChemicalData();
    });

    // Handle Android back button
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      if (this.showSpecificEmergency) {
        this.goBackToEmergencyTypes();
      } else {
        this.goBack();
      }
    });

    // Subscribe to database loading state
    this.dataSubscription = this.databaseService.allData$.subscribe(data => {
      if (data && data.length > 0) {
        this.loadChemicalData();
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

  private loadChemicalData() {
    this.isLoading = true;
    
    try {
      this.databaseService.allData$.subscribe(allData => {
        const chemical = allData.find((item: AllDataItem) => 
          item.type === 'chemical' && 
          (item.id === this.chemicalId || item.id === `id#${this.chemicalId}`)
        );
        
        if (chemical && chemical.data) {
          this.chemicalData = chemical.data;
          this.hasData = true;
          console.log('Chemical data loaded:', this.chemicalData);
        } else {
          this.hasData = false;
        }
        
        this.isLoading = false;
      }).unsubscribe();
      
    } catch (error) {
      console.error('Error loading chemical data:', error);
      this.hasData = false;
      this.isLoading = false;
    }
  }

  selectEmergencyType(emergencyType: EmergencyType) {
    this.selectedEmergencyType = emergencyType.key;
    this.selectedEmergencyData = this.getEmergencyData(emergencyType.key);
    this.showSpecificEmergency = true;
  }

  private getEmergencyData(emergencyKey: string): string[] {
    if (!this.chemicalData) return [];

    const emergencyMapping: { [key: string]: string[] } = {
      'eyeContact': ['id#hasFirstAidEye'],
      'fireFighting': ['id#hasFireFighting'],
      'flammability': ['id#hasFlammability'],
      'ingestion': ['id#hasFirstAidIngestion'],
      'inhalation': ['id#hasFirstAidInhalation'],
      'instability': ['id#hasConditionsOfInstability'],
      'skinContact': ['id#hasFirstAidSkin'],
      'spill': ['id#hasLargeSpill', 'id#hasSmallSpill']
    };

    const properties = emergencyMapping[emergencyKey] || [];
    const steps: string[] = [];

    properties.forEach(prop => {
      if (this.chemicalData[prop]) {
        const extractedSteps = this.extractStepsFromProperty(this.chemicalData[prop]);
        steps.push(...extractedSteps);
      }
    });

    return this.cleanAndFormatSteps(steps);
  }

  private extractStepsFromProperty(property: any): string[] {
    const steps: string[] = [];
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        let stepText = '';
        if (item && typeof item === 'object' && item['@id']) {
          stepText = this.formatIdValue(item['@id']);
        } else if (typeof item === 'string') {
          stepText = item;
        }
        
        if (stepText.trim().length > 0) {
          steps.push(stepText);
        }
      });
    } else if (property && typeof property === 'object' && property['@id']) {
      const stepText = this.formatIdValue(property['@id']);
      if (stepText.trim().length > 0) {
        steps.push(stepText);
      }
    } else if (typeof property === 'string') {
      if (property.trim().length > 0) {
        steps.push(property);
      }
    }
    
    return steps;
  }

  private formatIdValue(id: string): string {
    return id
      .replace('id#', '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .trim();
  }

  private cleanAndFormatSteps(steps: string[]): string[] {
    const cleanedSteps: string[] = [];
    const seenSteps = new Set<string>();

    steps.forEach(step => {
      // Remove redundant prefixes
      let cleanedStep = step
        .replace(/^Fire Fighting\s*/i, '')
        .replace(/^Health Haz\s*/i, '')
        .replace(/^Phys Haz\s*/i, '')
        .replace(/^Healthhaz\s*/i, '')
        .replace(/^Post\s*/i, '')
        .replace(/^Pre\s*/i, '')
        .trim();

      // Split on comma and clean each part
      const parts = cleanedStep.split(',').map(part => part.trim()).filter(part => part.length > 0);
      
      parts.forEach(part => {
        const normalizedPart = part.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (!seenSteps.has(normalizedPart) && part.length > 0) {
          seenSteps.add(normalizedPart);
          cleanedSteps.push(part);
        }
      });
    });

    return cleanedSteps;
  }

  getEmergencyIcon(emergencyKey: string): string {
    const iconMap: { [key: string]: string } = {
      'eyeContact': 'eye-outline',
      'fireFighting': 'flame-outline',
      'flammability': 'flame-outline',
      'ingestion': 'water-outline',
      'inhalation': 'pulse-outline',
      'instability': 'warning-outline',
      'skinContact': 'hand-left-outline',
      'spill': 'color-fill-outline'
    };
    
    return iconMap[emergencyKey] || 'warning-outline';
  }

  getEmergencyLabel(emergencyKey: string): string {
    const type = this.availableEmergencyTypes.find(t => t.key === emergencyKey);
    return type ? type.label : emergencyKey;
  }

  goBackToEmergencyTypes() {
    this.showSpecificEmergency = false;
    this.selectedEmergencyType = '';
    this.selectedEmergencyData = [];
  }

  goBack() {
    this.router.navigate(['/chemical-list']);
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