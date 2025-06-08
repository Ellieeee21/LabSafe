import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical } from '../services/database.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform, isPlatform } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline, searchOutline, chevronForwardOutline, refreshOutline
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-chemical-list',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ChemicalListPage implements OnInit, OnDestroy {
  searchTerm: string = '';
  chemicals: Chemical[] = [];
  filteredChemicals: Chemical[] = [];
  isLoading = true;
  emergencyType: string = '';
  emergencyId: string = '';
  
  isEmergencyMode: boolean = false;
  isIOS: boolean = false;
  
  private subscription: Subscription = new Subscription();
  private routeSubscription: Subscription = new Subscription();

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private platform: Platform
  ) {
    addIcons({ 
      homeOutline, flaskOutline, timeOutline, personOutline, searchOutline, chevronForwardOutline, refreshOutline
    });
    
    // Detect iOS platform
    this.isIOS = isPlatform('ios');
  }

  async ngOnInit() {
    // Configure iOS-specific settings
    await this.configureIOSSettings();
    
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      this.isEmergencyMode = !!(this.emergencyType || this.emergencyId);
      
      console.log('Emergency Type:', this.emergencyType);
      console.log('Emergency ID:', this.emergencyId);
      console.log('Emergency Mode:', this.isEmergencyMode);
    });

    await this.loadChemicals();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  /**
   * Configure iOS-specific settings
   */
  private async configureIOSSettings() {
    if (this.isIOS) {
      try {
        // Configure status bar for iOS
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#C00000' });
        
        // Set status bar overlay for iOS
        await StatusBar.setOverlaysWebView({ overlay: false });
        
        console.log('iOS settings configured');
      } catch (error) {
        console.warn('Could not configure iOS settings:', error);
      }
    }
  }

  async loadChemicals() {
    try {
      this.isLoading = true;
      
      this.subscription = this.databaseService.chemicals$.subscribe(chemicals => {
        console.log('Chemicals loaded:', chemicals.length);
        this.chemicals = chemicals;
        this.applySearch();
        this.isLoading = false;
      });
      
    } catch (error) {
      console.error('Error loading chemicals:', error);
      this.chemicals = [];
      this.filteredChemicals = [];
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.searchTerm = query;
    this.applySearch();
    
    // iOS haptic feedback for search
    if (this.isIOS && query.length > 0) {
      this.triggerHapticFeedback('light');
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applySearch();
    
    // iOS haptic feedback for clear action
    if (this.isIOS) {
      this.triggerHapticFeedback('light');
    }
  }

  private applySearch() {
    if (!this.searchTerm) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(this.searchTerm)
      );
    }
  }

  async onChemicalClick(chemical: Chemical) {
    // iOS haptic feedback for selection
    if (this.isIOS) {
      await this.triggerHapticFeedback('medium');
    }
    
    if (this.isEmergencyMode) {
      this.navigateToEmergencySteps(chemical);
    } else {
      this.navigateToChemicalDetails(chemical);
    }
  }

  navigateToChemicalDetails(chemical: Chemical) {
    console.log('Navigating to chemical details for:', chemical.name);
    
    // iOS-specific navigation transition
    if (this.isIOS) {
      this.router.navigate(['/chemical-details', chemical.id], {
        state: { iosTransition: true }
      });
    } else {
      this.router.navigate(['/chemical-details', chemical.id]);
    }
  }

  navigateToEmergencySteps(chemical: Chemical) {
    console.log('Navigating to emergency steps for chemical:', chemical.name);
    
    const queryParams: any = {
      chemicalId: chemical.id.toString(),
      chemicalName: chemical.name
    };
    
    if (this.emergencyType) {
      queryParams.emergencyType = this.emergencyType;
    }
    if (this.emergencyId) {
      queryParams.emergencyId = this.emergencyId;
    }
    
    // iOS-specific navigation transition
    if (this.isIOS) {
      this.router.navigate(['/emergency-steps'], { 
        queryParams,
        state: { iosTransition: true }
      });
    } else {
      this.router.navigate(['/emergency-steps'], { 
        queryParams 
      });
    }
  }

  async reloadFromJsonLd() {
    try {
      this.isLoading = true;
      
      // iOS haptic feedback for reload
      if (this.isIOS) {
        await this.triggerHapticFeedback('heavy');
      }
      
      await this.databaseService.reloadDatabase();
      console.log('Database reloaded successfully');
    } catch (error) {
      console.error('Error reloading database:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get displayedChemicals(): Chemical[] {
    return this.filteredChemicals;
  }

  // iOS Haptic Feedback
  private async triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy') {
    if (this.isIOS) {
      try {
        let style: ImpactStyle;
        switch (intensity) {
          case 'light':
            style = ImpactStyle.Light;
            break;
          case 'medium':
            style = ImpactStyle.Medium;
            break;
          case 'heavy':
            style = ImpactStyle.Heavy;
            break;
        }
        await Haptics.impact({ style });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    }
  }

  // Enhanced Bottom Navigation Methods with iOS feedback
  async navigateToHome() {
    console.log('Navigating to emergency types...');
    
    if (this.isIOS) {
      await this.triggerHapticFeedback('light');
    }
    
    this.router.navigate(['/emergency-types']);
  }

  async navigateToChemicals() {
    console.log('Navigating to chemicals (clearing emergency mode)...');
    
    if (this.isIOS) {
      await this.triggerHapticFeedback('light');
    }
    
    this.router.navigate(['/chemical-list']);
  }

  async navigateToHistory() {
    console.log('History feature coming soon');
    
    if (this.isIOS) {
      await this.triggerHapticFeedback('light');
    }
    
    // TODO: Implement history navigation when ready
  }

  async navigateToProfile() {
    console.log('Navigating to profile...');
    
    if (this.isIOS) {
      await this.triggerHapticFeedback('light');
    }
    
    this.router.navigate(['/profile']);
  }

  // iOS-specific utility methods
  getIOSClass(): string {
    return this.isIOS ? 'ios' : '';
  }

  async handleRefresh(event: any) {
    try {
      await this.reloadFromJsonLd();
    } finally {
      event.target.complete();
    }
  }

  // iOS-specific search bar configuration
  getSearchbarMode(): 'ios' | 'md' {
    return this.isIOS ? 'ios' : 'md';
  }

  hasSafeArea(): boolean {
    if (this.isIOS) {
      const style = getComputedStyle(document.documentElement);
      const safeAreaTop = style.getPropertyValue('env(safe-area-inset-top)');
      return safeAreaTop !== '' && safeAreaTop !== '0px';
    }
    return false;
  }
}