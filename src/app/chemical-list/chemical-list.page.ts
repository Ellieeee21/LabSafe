import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical } from '../services/database.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline, searchOutline, chevronForwardOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-chemical-list',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ChemicalListPage implements OnInit, OnDestroy {
  searchQuery: string = '';
  chemicals: Chemical[] = [];
  filteredChemicals: Chemical[] = [];
  isLoading = true;
  emergencyType: string = '';
  emergencyId: string = '';
  
  private subscription: Subscription = new Subscription();
  private routeSubscription: Subscription = new Subscription();

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({ 
      homeOutline, flaskOutline, timeOutline, personOutline, searchOutline, chevronForwardOutline
    });
  }

  async ngOnInit() {
    // Subscribe to route parameters to get emergency type
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      console.log('Emergency Type:', this.emergencyType);
      console.log('Emergency ID:', this.emergencyId);
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
    this.searchQuery = query;
    this.applySearch();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applySearch();
  }

  private applySearch() {
    if (!this.searchQuery) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(this.searchQuery) ||
        (chemical.formula && chemical.formula.toLowerCase().includes(this.searchQuery)) ||
        (chemical.casNumber && chemical.casNumber.toLowerCase().includes(this.searchQuery))
      );
    }
  }

  // Navigate to chemical details instead of emergency steps
  navigateToChemicalDetails(chemical: Chemical) {
    console.log('Navigating to chemical details for:', chemical.name);
    this.router.navigate(['/chemical-details', chemical.id]);
  }

  // Keep the old method for backward compatibility if needed
  navigateToEmergencySteps(chemical: Chemical) {
    console.log('Navigating to emergency steps for chemical:', chemical.name);
    
    // Build query parameters - include emergency type if it exists
    const queryParams: any = {
      chemicalId: chemical.id.toString(),
      chemicalName: chemical.name
    };
    
    // Pass through emergency type information if it exists
    if (this.emergencyType) {
      queryParams.emergencyType = this.emergencyType;
    }
    if (this.emergencyId) {
      queryParams.emergencyId = this.emergencyId;
    }
    
    this.router.navigate(['/emergency-steps'], { 
      queryParams 
    });
  }

  // Bottom Navigation Methods
  navigateToHome() {
    console.log('Navigating to emergency types...');
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    console.log('Already on Chemicals');
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