import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline 
} from 'ionicons/icons';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
    private databaseService: DatabaseService,
    private platform: Platform
  ) {
    addIcons({ 
      homeOutline, flaskOutline, timeOutline, personOutline
    });
  }

  async ngOnInit() {
    await this.setupPlatformSpecifics();
    await this.loadEmergencyTypes();
  }

  private async setupPlatformSpecifics() {
    if (this.platform.is('ios')) {
      await this.setupiOS();
    } else if (this.platform.is('android')) {
      await this.setupAndroid();
    }
  }

  private async setupiOS() {
    try {
      // Set status bar style for iOS
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#C00000' });
      
      // iOS keyboard handling
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.body.style.transform = `translateY(-${info.keyboardHeight / 4}px)`;
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.transform = 'translateY(0)';
      });
      
    } catch (error) {
      console.log('iOS setup error:', error);
    }
  }

  private async setupAndroid() {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#C00000' });
    } catch (error) {
      console.log('Android setup error:', error);
    }
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

  async navigateToSteps(emergencyType: EmergencyType) {
    if (this.platform.is('ios')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
    
    console.log('Navigating to chemical list for emergency type:', emergencyType.name);
    this.router.navigate(['/chemical-list'], { 
      queryParams: { 
        emergencyType: emergencyType.name,
        emergencyId: emergencyType.id.toString()
      } 
    });
  }

  // Bottom Navigation Methods
  async navigateToHome() {
    console.log('Already on Home (Emergency Types)');
    if (this.platform.is('ios')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  }

  async navigateToChemicals() {
    if (this.platform.is('ios')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
    console.log('Navigating to chemicals...');
    this.router.navigate(['/chemical-list']);
  }

  async navigateToHistory() {
    if (this.platform.is('ios')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
    console.log('History feature coming soon');
    // TODO: Implement history navigation when ready
  }

  async navigateToProfile() {
    if (this.platform.is('ios')) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
    console.log('Navigating to profile...');
    this.router.navigate(['/profile']);
  }

  // Utility methods for template
  get isIOS(): boolean {
    return this.platform.is('ios');
  }

  get isAndroid(): boolean {
    return this.platform.is('android');
  }
}