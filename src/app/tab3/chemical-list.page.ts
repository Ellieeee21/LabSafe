import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

interface Chemical {
  id: number;
  name: string;
}

@Component({
  selector: 'app-tab3',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class Tab3Page implements OnInit {
  chemicals: Chemical[] = [];
  filteredChemicals: Chemical[] = [];
  searchTerm: string = '';
  isLoading = true;

  constructor(
    public router: Router,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {
    await this.loadChemicals();
  }

  async loadChemicals() {
    try {
      this.isLoading = true;
      this.chemicals = await this.databaseService.getChemicals();
      this.filteredChemicals = [...this.chemicals];
    } catch (error) {
      console.error('Error loading chemicals:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.searchTerm = searchTerm;
    
    if (searchTerm.trim() === '') {
      this.filteredChemicals = [...this.chemicals];
    } else {
      this.filteredChemicals = this.chemicals.filter(chemical =>
        chemical.name.toLowerCase().includes(searchTerm)
      );
    }
  }

  onChemicalClick(chemical: Chemical) {
    // Navigate to chemical details page
    this.router.navigate(['/tabs/tab4', chemical.id]);
  }

  goBack() {
    this.router.navigate(['/tabs']);
  }

  // Method to load OWL data from assets
  async loadOWLDatabase() {
    try {
      this.isLoading = true;
      await this.databaseService.loadOWLData('/assets/data/json_database');
      await this.loadChemicals(); // Reload the chemicals list
    } catch (error) {
      console.error('Error loading OWL database:', error);
    } finally {
      this.isLoading = false;
    }
  }
}

// Also export as ChemicalListPage for compatibility
export class ChemicalListPage extends Tab3Page {}