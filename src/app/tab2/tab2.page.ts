import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
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
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel
} from '@ionic/angular/standalone';

export interface EmergencyStepData {
  title: string;
  description: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonLabel
  ]
})
export class Tab2Page implements OnInit {
  emergencyType: string = '';
  emergencyId: string = '';
  steps: EmergencyStepData[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      this.loadEmergencySteps();
    });
  }

  private loadEmergencySteps() {
    this.steps = this.getEmergencyStepsForType(this.emergencyType);
  }

  private getEmergencyStepsForType(emergencyTypeName: string): EmergencyStepData[] {
    const steps: EmergencyStepData[] = [];

    switch (emergencyTypeName.toLowerCase()) {
      case 'eye contact':
        steps.push(
          {
            title: 'Check and remove contact lenses',
            description: 'Immediately check if the person is wearing contact lenses and remove them carefully if present.'
          },
          {
            title: 'Flush eyes with cold water',
            description: 'Rinse eyes thoroughly with cold water for at least 15 minutes, holding eyelids open.'
          },
          {
            title: 'Seek medical attention',
            description: 'Get immediate medical attention, especially if irritation persists.'
          }
        );
        break;

      case 'skin contact':
        steps.push(
          {
            title: 'Remove contaminated clothing',
            description: 'Immediately remove all contaminated clothing and shoes.'
          },
          {
            title: 'Wash affected area',
            description: 'Wash the affected skin area thoroughly with soap and water.'
          },
          {
            title: 'Apply emollient if needed',
            description: 'Apply an emollient to irritated skin if necessary.'
          },
          {
            title: 'Seek medical attention',
            description: 'Get medical attention if irritation develops or persists.'
          }
        );
        break;

      case 'inhalation':
        steps.push(
          {
            title: 'Move to fresh air',
            description: 'Immediately move the person to fresh air and away from the contaminated area.'
          },
          {
            title: 'Check breathing',
            description: 'Monitor breathing and provide artificial respiration if needed.'
          },
          {
            title: 'Seek medical attention',
            description: 'Get immediate medical attention, especially if breathing difficulties persist.'
          }
        );
        break;

      case 'ingestion':
        steps.push(
          {
            title: 'Do not induce vomiting',
            description: 'DO NOT induce vomiting unless directed by medical personnel.'
          },
          {
            title: 'Rinse mouth',
            description: 'Rinse mouth with water if the person is conscious.'
          },
          {
            title: 'Loosen tight clothing',
            description: 'Loosen tight clothing around the neck and waist.'
          },
          {
            title: 'Seek immediate medical attention',
            description: 'Get immediate medical attention and bring the chemical container or label.'
          }
        );
        break;

      case 'fire fighting':
      case 'fire':
        steps.push(
          {
            title: 'Use dry chemical powder',
            description: 'For small fires, use dry chemical powder, carbon dioxide, or foam.'
          },
          {
            title: 'Use alcohol foam for large fires',
            description: 'For large fires, use alcohol foam, fog, or water spray.'
          },
          {
            title: 'Use water spray',
            description: 'Use water spray to cool containers and protect personnel.'
          }
        );
        break;

      case 'flammability':
        steps.push(
          {
            title: 'Remove ignition sources',
            description: 'Eliminate all ignition sources and sources of heat.'
          },
          {
            title: 'Ensure proper ventilation',
            description: 'Provide adequate ventilation to prevent vapor accumulation.'
          },
          {
            title: 'Use appropriate fire suppression',
            description: 'Have appropriate fire suppression equipment readily available.'
          }
        );
        break;

      case 'instability or reactivity':
        steps.push(
          {
            title: 'Isolate the area',
            description: 'Isolate the spill or leak area immediately.'
          },
          {
            title: 'Eliminate ignition sources',
            description: 'Remove all sources of ignition and heat.'
          },
          {
            title: 'Use appropriate PPE',
            description: 'Ensure all personnel wear appropriate personal protective equipment.'
          }
        );
        break;

      case 'spill':
        steps.push(
          {
            title: 'Stop the leak if safe',
            description: 'Stop the leak if it can be done safely without risk.'
          },
          {
            title: 'Absorb with inert material',
            description: 'Absorb spill with inert dry material and place in appropriate containers.'
          },
          {
            title: 'Prevent entry to drains',
            description: 'Prevent entry into sewers, basements, or confined areas.'
          },
          {
            title: 'Clean contaminated area',
            description: 'Clean the contaminated area thoroughly after spill removal.'
          }
        );
        break;
    }

    return steps;
  }

  goBack() {
    this.location.back();
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
    console.log('Profile feature coming soon');
  }
}