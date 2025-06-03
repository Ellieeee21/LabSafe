import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { DatabaseService, Chemical } from '../services/database.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  flaskOutline, 
  timeOutline, 
  personOutline, 
  searchOutline, 
  chevronForwardOutline, 
  refreshOutline
} from 'ionicons/icons';

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
  isLoading: boolean = true;
  emergencyType: string = '';
  emergencyId: string = '';
  
  private subscription: Subscription = new Subscription();
  private routeSubscription: Subscription = new Subscription();

  private databaseService = inject(DatabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    addIcons({ 
      homeOutline, 
      flaskOutline, 
      timeOutline, 
      personOutline, 
      searchOutline, 
      chevronForwardOutline, 
      refreshOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.routeSubscription = this.route.queryParams.subscribe((queryParams: Params) => {
      this.emergencyType = queryParams['emergencyType'] || '';
      this.emergencyId = queryParams['emergencyId'] || '';
      
      console.log('Emergency Type:', this.emergencyType);
      console.log('Emergency ID:', this.emergencyId);
    });

    await this.loadChemicals();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  async loadChemicals(): Promise<void> {
    try {
      this.isLoading = true;
      
      this.subscription = this.databaseService.chemicals$.subscribe((chemicals: Chemical[]) => {
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

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value.toLowerCase().trim();
    this.searchTerm = query;
    this.applySearch();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applySearch();
  }

  private applySearch(): void {
    if (!this.searchTerm) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(this.searchTerm) ||
        (chemical.formula && chemical.formula.toLowerCase().includes(this.searchTerm)) ||
        (chemical.casNumber && chemical.casNumber.toLowerCase().includes(this.searchTerm))
      );
    }
  }

  onChemicalClick(chemical: Chemical): void {
    this.navigateToChemicalDetails(chemical);
  }

  navigateToChemicalDetails(chemical: Chemical): void {
    console.log('Navigating to chemical details for:', chemical.name);
    this.router.navigate(['/chemical-details', chemical.id]);
  }

  navigateToEmergencySteps(chemical: Chemical): void {
    console.log('Navigating to emergency steps for chemical:', chemical.name);
    
    const queryParams: { [key: string]: string } = {
      chemicalId: chemical.id.toString(),
      chemicalName: chemical.name
    };
    
    if (this.emergencyType && this.emergencyType.length > 0) {
      queryParams['emergencyType'] = this.emergencyType;
    }
    if (this.emergencyId && this.emergencyId.length > 0) {
      queryParams['emergencyId'] = this.emergencyId;
    }
    
    this.router.navigate(['/emergency-steps'], { 
      queryParams 
    });
  }

  async reloadFromJsonLd(): Promise<void> {
    try {
      this.isLoading = true;
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

  navigateToHome(): void {
    console.log('Navigating to emergency types...');
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals(): void {
    console.log('Already on Chemicals');
  }

  navigateToHistory(): void {
    console.log('History feature coming soon');
  }

  navigateToProfile(): void {
    console.log('Navigating to profile...');
    this.router.navigate(['/profile']);
  }
}