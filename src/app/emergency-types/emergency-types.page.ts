import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline 
} from 'ionicons/icons';

interface EmergencyType {
  id: number;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-emergency-types',
  templateUrl: './emergency-types.page.html',
  styleUrls: ['./emergency-types.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class EmergencyTypesPage implements OnInit {
  searchQuery: string = '';
  emergencyTypes: EmergencyType[] = [];
  filteredEmergencyTypes: EmergencyType[] = [];
  isLoading = true;

  constructor(
    private router: Router,
    private databaseService: DatabaseService
  ) {
    addIcons({ 
      homeOutline, flaskOutline, timeOutline, personOutline
    });
  }

  async ngOnInit() {
    await this.loadEmergencyTypes();
  }

  async loadEmergencyTypes() {
    try {
      this.isLoading = true;
      
      // Complete emergency types
      this.emergencyTypes = [
        { id: 1, name: 'Eye Contact', icon: 'Eye.png' },
        { id: 2, name: 'Fire', icon: 'Fire-fighting.png' },
        { id: 4, name: 'Ingestion', icon: 'Ingestion.png' },
        { id: 5, name: 'Inhalation', icon: 'Inhalation.png' },
        { id: 7, name: 'Skin Contact', icon: 'Skin-contact.png' },
        { id: 8, name: 'Spill', icon: 'Spill.png' }
      ];
      
      this.filteredEmergencyTypes = [...this.emergencyTypes];
      
    } catch (error) {
      console.error('Error loading emergency types:', error);
      this.emergencyTypes = [];
      this.filteredEmergencyTypes = [];
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.searchQuery = query;
    
    if (!query) {
      this.filteredEmergencyTypes = [...this.emergencyTypes];
    } else {
      this.filteredEmergencyTypes = this.emergencyTypes.filter(
        emergencyType => emergencyType.name.toLowerCase().includes(query)
      );
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredEmergencyTypes = [...this.emergencyTypes];
  }

 navigateToSteps(emergencyType: EmergencyType) {
  console.log('Navigating to chemical list for emergency type:', emergencyType.name);
  this.router.navigate(['/chemical-list'], { 
    queryParams: { 
      emergencyType: emergencyType.name,
      emergencyId: emergencyType.id.toString()
    } 
  });
}

  // Bottom Navigation Methods
  navigateToHome() {
    console.log('Already on Home (Emergency Types)');
  }

  navigateToChemicals() {
    console.log('Navigating to chemicals...');
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