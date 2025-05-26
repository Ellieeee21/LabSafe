import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-chemical-details',
  templateUrl: './chemical-details.page.html',
  styleUrls: ['./chemical-details.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ChemicalDetailsPage implements OnInit {
  chemical: Chemical | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {
    const chemicalId = Number(this.route.snapshot.paramMap.get('id'));
    if (chemicalId && !isNaN(chemicalId)) {
      await this.loadChemicalDetails(chemicalId);
    } else {
      this.error = 'Invalid chemical ID';
      this.isLoading = false;
    }
  }

  async loadChemicalDetails(chemicalId: number) {
    try {
      this.isLoading = true;
      this.error = null;
      
      // Load chemical info only
      this.chemical = await this.databaseService.getChemicalById(chemicalId);
      
      if (!this.chemical) {
        this.error = 'Chemical not found';
        return;
      }
      
    } catch (error) {
      console.error('Error loading chemical details:', error);
      this.error = 'Failed to load chemical details';
    } finally {
      this.isLoading = false;
    }
  }

  // Bottom Navigation Methods
  navigateToHome() {
    console.log('Navigating to Emergency Types (Home)...');
    this.router.navigate(['/tabs/tab1']).then(
      success => {
        console.log('Navigation to home successful:', success);
      },
      error => {
        console.error('Navigation to home failed:', error);
      }
    );
  }

  navigateToChemicals() {
    console.log('Navigating to chemicals...');
    this.router.navigate(['/chemical-list']).then(
      success => {
        console.log('Navigation to chemicals successful:', success);
      },
      error => {
        console.error('Navigation to chemicals failed, trying fallback:', error);
        this.router.navigate(['/tabs/tab3']);
      }
    );
  }

  navigateToHistory() {
    console.log('History feature coming soon');
    // TODO: Implement history navigation when ready
  }

  navigateToProfile() {
    console.log('Profile feature coming soon');
    // TODO: Implement profile navigation when ready
  }

  // Keep the old methods for backward compatibility
  goBack() {
    this.navigateToChemicals();
  }

  navigateToChemicalList() {
    this.navigateToChemicals();
  }
}