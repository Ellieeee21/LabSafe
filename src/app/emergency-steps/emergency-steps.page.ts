import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DatabaseService, EmergencyClass } from '../services/database.service';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonLabel
} from '@ionic/angular/standalone';

export interface EmergencyStepData {
  title: string;
  description: string;
}

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
    IonIcon,
  ]
})
export class EmergencyStepsPage implements OnInit, OnDestroy {
  emergencyType: string = '';
  emergencyId: string = '';
  chemicalId: string = '';
  chemicalName: string = '';
  steps: EmergencyStepData[] = [];
  emergencyClasses: EmergencyClass[] = [];
  classHierarchy: EmergencyClass[] = [];
  hasData: boolean = false;
  private backButtonSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private platform: Platform,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      this.chemicalId = params['chemicalId'] || '';
      this.chemicalName = params['chemicalName'] || '';
      
      if (this.chemicalId) {
        this.loadChemicalEmergencyData();
      } else {
        this.loadAllEmergencyClasses();
      }
    });

    // Handle Android back button
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.goBack();
    });
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  private async loadChemicalEmergencyData() {
    try {
      const emergencyClasses = await this.databaseService.getEmergencyClassesForChemical(this.chemicalId);
      
      if (emergencyClasses && emergencyClasses.length > 0) {
        this.emergencyClasses = emergencyClasses;
        this.buildClassHierarchy();
        this.hasData = true;
      } else {
        this.hasData = false;
      }
    } catch (error) {
      console.error('Error loading chemical emergency data:', error);
      this.hasData = false;
    }
  }

  private async loadAllEmergencyClasses() {
    try {
      const allClasses = await this.databaseService.getAllEmergencyClasses();
      
      if (allClasses && allClasses.length > 0) {
        this.emergencyClasses = allClasses;
        this.buildClassHierarchy();
        this.hasData = true;
      } else {
        this.hasData = false;
      }
    } catch (error) {
      console.error('Error loading all emergency classes:', error);
      this.hasData = false;
    }
  }

  private buildClassHierarchy() {
    // Build a hierarchical structure from the emergency classes
    const rootClasses = this.emergencyClasses.filter(cls => !cls.parentClass);
    const childClasses = this.emergencyClasses.filter(cls => cls.parentClass);
    
    this.classHierarchy = rootClasses.map(rootClass => {
      const children = childClasses.filter(child => child.parentClass === rootClass.id);
      return {
        ...rootClass,
        subClasses: children.map(child => child.id),
        children: children // Add actual child objects for easier access
      } as any;
    });

    // Convert classes to steps format for display
    this.convertClassesToSteps();
  }

  private convertClassesToSteps() {
    this.steps = [];
    
    this.classHierarchy.forEach((rootClass: any) => {
      // Add root class as a step
      this.steps.push({
        title: rootClass.name || 'Emergency Procedure',
        description: rootClass.description || 'Follow the procedures outlined for this emergency type.'
      });

      // Add child classes as sub-steps
      if (rootClass.children && rootClass.children.length > 0) {
        rootClass.children.forEach((child: EmergencyClass) => {
          this.steps.push({
            title: `• ${child.name}`,
            description: child.description || 'Specific procedure step for this emergency type.'
          });
        });
      }
    });

    // If no structured data is available but we have classes, create basic steps
    if (this.steps.length === 0 && this.emergencyClasses.length > 0) {
      this.emergencyClasses.forEach(cls => {
        this.steps.push({
          title: cls.name || 'Emergency Procedure',
          description: cls.description || 'Follow the safety procedures for this emergency type.'
        });
      });
    }
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
    console.log('Navigating to chemicals from emergency steps...');
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
  }

  navigateToProfile() {
    console.log('Navigating to profile from emergency steps...');
    this.router.navigate(['/profile']);
  }
}