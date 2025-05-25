import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface Chemical {
  id: number;
  name: string;
}

interface EmergencyType {
  id: number;
  name: string;
}

interface FirstAidStep {
  id: number;
  chemical_id: number;
  emergency_type_id: number;
  step_order: number;
  step: string;
}

interface EmergencyProcedure {
  emergencyType: EmergencyType;
  steps: FirstAidStep[];
}

@Component({
  selector: 'app-chemical-details',
  templateUrl: './chemical-details.page.html',
  styleUrls: ['./chemical-details.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ChemicalDetailsPage implements OnInit {
  chemical: Chemical | null = null;
  emergencyProcedures: EmergencyProcedure[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {
    const chemicalId = Number(this.route.snapshot.paramMap.get('id'));
    if (chemicalId && !isNaN(chemicalId)) {
      await this.loadChemicalDetails(chemicalId);
    } else {
      this.error = 'Invalid chemical ID';
      this.isLoading = false;
    }
  }

  async loadChemicalDetails(chemicalId: number) {
    try {
      this.isLoading = true;
      this.error = null;
      
      // Load chemical info
      this.chemical = await this.databaseService.getChemicalById(chemicalId);
      
      if (!this.chemical) {
        this.error = 'Chemical not found';
        return;
      }
      
      // Load emergency procedures
      const emergencyTypes = await this.databaseService.getEmergencyTypes();
      const firstAidSteps = await this.databaseService.getFirstAidStepsByChemical(chemicalId);
      
      // Group steps by emergency type
      this.emergencyProcedures = emergencyTypes.map((emergencyType: EmergencyType) => {
        const steps = firstAidSteps
          .filter((step: FirstAidStep) => step.emergency_type_id === emergencyType.id)
          .sort((a: FirstAidStep, b: FirstAidStep) => a.step_order - b.step_order);
        
        return {
          emergencyType,
          steps
        };
      }).filter((procedure: EmergencyProcedure) => procedure.steps.length > 0);
      
    } catch (error) {
      console.error('Error loading chemical details:', error);
      this.error = 'Failed to load chemical details';
    } finally {
      this.isLoading = false;
    }
  }

  // Replace the navigation methods in your chemical-details.page.ts with these:

goBack() {
  // Navigate back to chemical list
  this.router.navigate(['/chemical-list']).then(
    success => console.log('Navigation back successful:', success),
    error => {
      console.error('Navigation back failed, trying fallback:', error);
      this.router.navigate(['/tabs/tab3']);
    }
  );
}

navigateToHome() {
  this.router.navigate(['/tabs/tab1']);
}

navigateToChemicalList() {
  this.router.navigate(['/chemical-list']).then(
    success => console.log('Navigation to chemical list successful:', success),
    error => {
      console.error('Navigation failed, trying fallback:', error);
      this.router.navigate(['/tabs/tab3']);
    }
  );
}

getEmergencyIcon(emergencyType: string): string {
  switch (emergencyType.toLowerCase()) {
    case 'eye contact':
      return 'eye';
    case 'fire fighting':
      return 'flame';
    case 'flammability':
      return 'warning';
    case 'ingestion':
      return 'medical';
    case 'inhalation':
      return 'cloud';
    case 'instability or reactivity':
      return 'nuclear';
    case 'skin contact':
      return 'hand-left';
    case 'spill':
      return 'water';
    default:
      return 'alert-circle';
  }
}
}