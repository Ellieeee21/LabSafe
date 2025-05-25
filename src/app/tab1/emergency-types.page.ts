import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { 
  IonTabs, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonSearchbar, 
  IonCard, 
  IonCardContent, 
  IonIcon, 
  IonTabBar, 
  IonTabButton, 
  IonLabel 
} from "@ionic/angular/standalone";

export interface EmergencyType {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-emergency-types',
  templateUrl: './emergency-types.page.html',  
  styleUrls: ['./emergency-types.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonTabs,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonIcon,
    IonTabBar,
    IonTabButton,
    IonLabel
  ]
})
export class EmergencyTypesPage implements OnInit {
  searchQuery: string = '';
  emergencyTypes: EmergencyType[] = [
    // Updated to match your renamed icon files
    { id: 'eye_contact', name: 'Eye Contact', icon: 'Eye.png' },
    { id: 'fire_fighting', name: 'Fire Fighting', icon: 'Fire-fighting.png' },
    { id: 'flammability', name: 'Flammability', icon: 'Flammability.png' },
    { id: 'ingestion', name: 'Ingestion', icon: 'Ingestion.png' },
    { id: 'inhalation', name: 'Inhalation', icon: 'Inhalation.png' },
    { id: 'instability', name: 'Instability or Reactivity', icon: 'Instability.png' },
    { id: 'skin_contact', name: 'Skin Contact', icon: 'Skin-contact.png' },
    { id: 'spill', name: 'Spill', icon: 'Spill.png' }
  ];

  filteredEmergencyTypes: EmergencyType[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.filteredEmergencyTypes = [...this.emergencyTypes];
    
    // Debug logging to check icon paths
    console.log('Emergency types with icons:', this.emergencyTypes);
    this.emergencyTypes.forEach(type => {
      console.log(`${type.name}: assets/icon/${type.icon}`);
    });
  }

  // Method to get full icon path for debugging
  getIconPath(iconName: string): string {
    const fullPath = `assets/icon/${iconName}`;
    console.log('Icon path for', iconName, ':', fullPath);
    return fullPath;
  }

  // Method to handle image load errors
  onImageError(event: any, emergencyType: EmergencyType) {
    console.error('Failed to load image for', emergencyType.name, ':', event);
    console.log('Attempted path:', `assets/icon/${emergencyType.icon}`);
    
    // Try alternative path or set a fallback
    const img = event.target;
    if (img.src.includes('assets/icon/')) {
      // Try without spaces in filename
      const newIcon = emergencyType.icon.replace(/\s+/g, '');
      console.log('Trying alternative path:', `assets/icon/${newIcon}`);
      img.src = `assets/icon/${newIcon}`;
    }
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value;
    this.filterEmergencyTypes();
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredEmergencyTypes = [...this.emergencyTypes];
  }

  private filterEmergencyTypes() {
    if (!this.searchQuery.trim()) {
      this.filteredEmergencyTypes = [...this.emergencyTypes];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredEmergencyTypes = this.emergencyTypes.filter(type =>
      type.name.toLowerCase().includes(query)
    );
  }

  navigateToSteps(emergencyType: EmergencyType) {
    this.router.navigate(['/tabs/tab2'], {
      queryParams: {
        emergencyType: emergencyType.name,
        emergencyId: emergencyType.id
      }
    });
  }

  navigateToChemicals() {
    console.log('Navigating to chemicals...');
    // Use tab3 route which should be the chemical list
    this.router.navigate(['/tabs/tab3']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
  }

  navigateToProfile() {
    console.log('Profile feature coming soon');
  }
}