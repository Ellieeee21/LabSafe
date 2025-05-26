import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Add this import
import { IonicModule } from '@ionic/angular';

// Add the missing interfaces if needed
interface EmergencyType {
  id: number;
  name: string;
  icon: string;
  // Add other properties as needed
}

@Component({
  selector: 'app-emergency-types',
  templateUrl: './emergency-types.page.html',
  styleUrls: ['./emergency-types.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule] // Add FormsModule here
})
export class EmergencyTypesPage implements OnInit {
  searchQuery: string = '';
  filteredEmergencyTypes: EmergencyType[] = [];
  emergencyTypes: EmergencyType[] = [];

  constructor(
    private router: Router
  ) {}

  async ngOnInit() {
    // Initialize with hardcoded emergency types since this is a standalone tab
    this.loadEmergencyTypes();
  }

  loadEmergencyTypes() {
    // Hardcoded emergency types for standalone tab
    this.emergencyTypes = [
      { id: 1, name: 'Chemical Spill', icon: 'chemical-spill.png' },
      { id: 2, name: 'Fire Emergency', icon: 'fire.png' },
      { id: 3, name: 'Gas Leak', icon: 'gas-leak.png' },
      { id: 4, name: 'Electrical Hazard', icon: 'electrical.png' },
      { id: 5, name: 'Medical Emergency', icon: 'medical.png' },
      { id: 6, name: 'Equipment Failure', icon: 'equipment.png' }
    ];
    this.filteredEmergencyTypes = [...this.emergencyTypes];
  }

  onSearchChange(event: any) {
    const query = event.target.value?.toLowerCase() || '';
    this.searchQuery = query;
    
    if (query.trim() === '') {
      this.filteredEmergencyTypes = [...this.emergencyTypes];
    } else {
      this.filteredEmergencyTypes = this.emergencyTypes.filter(emergencyType =>
        emergencyType.name.toLowerCase().includes(query)
      );
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredEmergencyTypes = [...this.emergencyTypes];
  }

  navigateToSteps(emergencyType: EmergencyType) {
    console.log('Navigating to steps for:', emergencyType.name);
    // Navigate to emergency steps page
    this.router.navigate(['/emergency-steps', emergencyType.id]);
  }

  // Bottom Navigation Methods - All 4 buttons
  navigateToHome() {
    console.log('Already on Home (Emergency Types)');
    // Already on home page - do nothing
  }

  navigateToChemicals() {
    console.log('Navigating to chemicals...');
    this.router.navigate(['/chemical-list']).then(
      success => {
        console.log('Navigation to chemicals successful:', success);
      },
      error => {
        console.error('Navigation to chemicals failed, trying fallback:', error);
        this.router.navigate(['/tabs/tab3']);
      }
    );
  }

  navigateToHistory() {
    console.log('History feature coming soon');
    // TODO: Implement history navigation when ready
    // this.router.navigate(['/history']);
  }

  navigateToProfile() {
    console.log('Profile feature coming soon');
    // TODO: Implement profile navigation when ready
    // this.router.navigate(['/profile']);
  }
}