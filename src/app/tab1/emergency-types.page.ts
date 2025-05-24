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
  icon: string; // This will now reference SVG file names
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
    { id: 'eye_contact', name: 'Eye Contact', icon: 'eye-contact' },
    { id: 'fire_fighting', name: 'Fire Fighting', icon: 'fire-fighting' },
    { id: 'flammability', name: 'Flammability', icon: 'flammability' },
    { id: 'ingestion', name: 'Ingestion', icon: 'ingestion' },
    { id: 'inhalation', name: 'Inhalation', icon: 'inhalation' },
    { id: 'instability', name: 'Instability or Reactivity', icon: 'instability-reactivity' },
    { id: 'skin_contact', name: 'Skin Contact', icon: 'skin-contact' }
  ];

  filteredEmergencyTypes: EmergencyType[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.filteredEmergencyTypes = [...this.emergencyTypes];
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
    this.router.navigate(['/emergency-steps'], {
      queryParams: {
        emergencyType: emergencyType.name,
        emergencyId: emergencyType.id
      }
    });
  }

  navigateToChemicals() {
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    // TODO: Implement history navigation
    console.log('History feature coming soon');
  }

  navigateToProfile() {
    // TODO: Implement profile navigation
    console.log('Profile feature coming soon');
  }
}