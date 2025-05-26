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
  }

  ngOnInit() {
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions() {
    const loadingSub = this.databaseService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
    this.subscriptions.push(loadingSub);

    const chemicalsSub = this.databaseService.chemicals$.subscribe(chemicals => {
      this.chemicals = chemicals;
      this.applyFilter();
    });
    this.subscriptions.push(chemicalsSub);
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value?.toLowerCase() || '';
    this.applyFilter();
  }

  private applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(this.searchTerm)
      );
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  async onChemicalClick(chemical: Chemical) {
    // Navigate to chemical details with the chemical's ID
    this.router.navigate(['/chemical-details', chemical.id]);
  }

  async reloadFromJsonLd() {
    try {
      await this.databaseService.reloadDatabase();
      this.showToast('Chemical database reloaded successfully');
    } catch (error) {
      this.showToast('Error reloading data', 'danger');
    }
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

  // Navigation methods
  navigateToHome() {
    this.router.navigate(['/tabs/tab1']);
  }

  navigateToChemicals() {
    // Already on chemicals page
  }

  navigateToHistory() {
    this.showToast('History feature coming soon', 'primary');
  }

  navigateToProfile() {
    this.showToast('Profile feature coming soon', 'primary');
  }
}