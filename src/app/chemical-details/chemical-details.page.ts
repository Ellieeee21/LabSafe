import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonButton, IonIcon, IonSpinner, IonBackButton, IonButtons,
  IonText
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-chemical-details',
  templateUrl: './chemical-details.page.html',
  styleUrls: ['./chemical-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonIcon, IonSpinner,
    IonText
  ]
})
export class ChemicalDetailsPage implements OnInit {
  chemical: Chemical | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private databaseService: DatabaseService
  ) {
    
  }

  async ngOnInit() {
    const chemicalId = this.route.snapshot.paramMap.get('id');
    if (chemicalId) {
      await this.loadChemicalDetails(chemicalId);
    } else {
      this.error = 'Invalid chemical ID';
      this.isLoading = false;
    }
  }

  async loadChemicalDetails(chemicalId: string) {
    try {
      this.isLoading = true;
      this.error = null;
      
      // Convert string ID to number before passing to the service
      const numericId = parseInt(chemicalId, 10);
      
      // Check if conversion was successful
      if (isNaN(numericId)) {
        this.error = 'Invalid chemical ID format';
        return;
      }
      
      this.chemical = await this.databaseService.getChemicalById(numericId);
      
      if (!this.chemical) {
        this.error = 'Chemical not found';
      }
      
    } catch (error) {
      console.error('Error loading chemical details:', error);
      this.error = 'Failed to load chemical details';
    } finally {
      this.isLoading = false;
    }
  }

  // Navigation methods
  navigateToHome() {
    this.router.navigate(['/tabs/tab1']);
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

  goBack() {
    this.navigateToChemicals();
  }
}