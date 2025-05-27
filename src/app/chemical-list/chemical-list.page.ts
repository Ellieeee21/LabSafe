import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DatabaseService, Chemical } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, 
  IonCard, IonCardContent, IonSpinner, IonButton, IonIcon,
  IonList, IonItem, IonLabel 
} from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import { 
  flaskOutline, chevronForwardOutline, searchOutline, refreshOutline,
  homeOutline, timeOutline, personOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-chemical-list',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar,
    IonCard, IonCardContent, IonSpinner, IonButton, IonIcon,
  ]
})
export class ChemicalListPage implements OnInit, OnDestroy {
  chemicals: Chemical[] = [];
  filteredChemicals: Chemical[] = [];
  isLoading = false;
  searchTerm = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private databaseService: DatabaseService,
    private toastController: ToastController
  ) {
    addIcons({ 
      flaskOutline, chevronForwardOutline, searchOutline, refreshOutline,
      homeOutline, timeOutline, personOutline
    });
    
    console.log('ChemicalListPage constructor called');
  }

  ngOnInit() {
    console.log('ChemicalListPage ngOnInit called');
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    console.log('ChemicalListPage ngOnDestroy called');
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions() {
    console.log('Setting up subscriptions...');
    
    const loadingSub = this.databaseService.loading$.subscribe(loading => {
      console.log('Loading state changed:', loading);
      this.isLoading = loading;
    });
    this.subscriptions.push(loadingSub);

    const chemicalsSub = this.databaseService.chemicals$.subscribe(chemicals => {
      console.log('Chemicals received from service:', chemicals.length, 'chemicals');
      console.log('First few chemicals:', chemicals.slice(0, 3));
      this.chemicals = chemicals;
      this.applyFilter();
    });
    this.subscriptions.push(chemicalsSub);
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value?.toLowerCase() || '';
    console.log('Search term changed:', this.searchTerm);
    this.applyFilter();
  }

  private applyFilter() {
    console.log('Applying filter with search term:', this.searchTerm);
    console.log('Total chemicals to filter:', this.chemicals.length);
    
    if (!this.searchTerm.trim()) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(this.searchTerm)
      );
    }
    
    console.log('Filtered chemicals count:', this.filteredChemicals.length);
  }

  clearSearch() {
    console.log('Clearing search');
    this.searchTerm = '';
    this.applyFilter();
  }

  async onChemicalClick(chemical: Chemical) {
    console.log('Chemical clicked:', chemical.name, 'ID:', chemical.id);
    // Show chemical info in a toast or alert for now
    this.showToast(`Chemical: ${chemical.name}`, 'primary');
  }

  async reloadFromJsonLd() {
    console.log('Reloading from JSON-LD...');
    try {
      await this.databaseService.reloadDatabase();
      this.showToast('Chemical database reloaded successfully');
    } catch (error) {
      console.error('Error reloading data:', error);
      this.showToast('Error reloading data: ' + error, 'danger');
    }
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // Navigation methods
  navigateToHome() {
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    // Already on chemicals page - do nothing or refresh
    console.log('Already on chemicals page');
  }

  navigateToHistory() {
    this.showToast('History feature coming soon', 'primary');
  }

  navigateToProfile() {
    console.log('Navigating to profile from chemical list...');
    this.router.navigate(['/profile']);
  }
  
  // Debug methods - you can call these from the browser console
  debugInfo() {
    console.log('=== DEBUG INFO ===');
    console.log('Chemicals array length:', this.chemicals.length);
    console.log('Filtered chemicals length:', this.filteredChemicals.length);
    console.log('Is loading:', this.isLoading);
    console.log('Search term:', this.searchTerm);
    console.log('All chemicals:', this.chemicals);
    console.log('=================');
  }
}