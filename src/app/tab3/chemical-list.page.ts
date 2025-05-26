import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DatabaseService, Chemical } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonSearchbar, 
  IonCard, 
  IonCardContent, 
  IonSpinner,
  IonButton,
  IonIcon
} from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import { 
  flaskOutline, 
  chevronForwardOutline, 
  searchOutline, 
  refreshOutline,
  homeOutline,
  timeOutline,
  personOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-chemical-list',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonButton,
    IonIcon
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
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ 
      flaskOutline, 
      chevronForwardOutline, 
      searchOutline, 
      refreshOutline,
      homeOutline,
      timeOutline,
      personOutline
    });
  }

  ngOnInit() {
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions() {
    // Subscribe to loading state
    const loadingSub = this.databaseService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
    this.subscriptions.push(loadingSub);

    // Subscribe to chemicals data
    const chemicalsSub = this.databaseService.chemicals$.subscribe(chemicals => {
      this.chemicals = chemicals;
      this.applyFilter();
    });
    this.subscriptions.push(chemicalsSub);
  }

  onSearchChange(event: any) {
    const searchTerm = event.target.value?.toLowerCase() || '';
    this.searchTerm = searchTerm;
    this.applyFilter();
  }

  private applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      const searchTerm = this.searchTerm.toLowerCase().trim();
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(searchTerm)
      );
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  onChemicalClick(chemical: Chemical) {
    console.log('Chemical clicked:', chemical.name);
    // Navigate to chemical details page if needed
    // For now, just log the click
  }

  async reloadFromJsonLd() {
    console.log('Reloading data...');
    await this.databaseService.reloadDatabase();
    this.showToast('Data reloaded successfully');
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  getFilteredCount(): number {
    return this.filteredChemicals.length;
  }

  getTotalCount(): number {
    return this.chemicals.length;
  }

  // Navigation methods
  navigateToHome() {
    console.log('Navigating to Home...');
    this.router.navigate(['/tabs/tab1']);
  }

  navigateToChemicals() {
    console.log('Already on chemicals page');
    // Already on chemicals page - do nothing
  }

  navigateToHistory() {
    console.log('History feature coming soon');
    this.showToast('History feature coming soon', 'primary');
  }

  navigateToProfile() {
    console.log('Profile feature coming soon');
    this.showToast('Profile feature coming soon', 'primary');
  }

  goBack() {
    this.navigateToHome();
  }
}

// Export alias for compatibility
export class Tab3Page extends ChemicalListPage {}