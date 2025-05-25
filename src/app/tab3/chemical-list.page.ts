import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatabaseService } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

interface Chemical {
  id: number;
  name: string;
}

@Component({
  selector: 'app-chemical-list',
  templateUrl: './chemical-list.page.html',
  styleUrls: ['./chemical-list.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ChemicalListPage implements OnInit {
  chemicals: Chemical[] = [];
  filteredChemicals: Chemical[] = [];
  searchTerm: string = '';
  isLoading = true;

  constructor(
    public router: Router,
    private databaseService: DatabaseService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadChemicals();
  }

  async loadChemicals() {
    try {
      this.isLoading = true;
      
      // First try to load from database service
      this.chemicals = await this.databaseService.getChemicals();
      
      // If no chemicals found, try to load from JSON file
      if (this.chemicals.length === 0) {
        await this.loadFromJSONFile();
      }
      
      this.filteredChemicals = [...this.chemicals];
    } catch (error) {
      console.error('Error loading chemicals:', error);
      // Try to load from JSON file as fallback
      await this.loadFromJSONFile();
    } finally {
      this.isLoading = false;
    }
  }

  async loadFromJSONFile() {
    try {
      console.log('Attempting to load from JSON file...');
      
      // Try different possible paths for the JSON file
      const possiblePaths = [
        'assets/data/json_database.json',
        'assets/data/json_database',
        'assets/json_database.json',
        'assets/data/chemicals.json'
      ];

      for (const path of possiblePaths) {
        try {
          console.log(`Trying path: ${path}`);
          const data = await this.http.get<any>(path).toPromise();
          
          if (data) {
            console.log('Successfully loaded data from:', path);
            this.parseJSONData(data);
            return;
          }
        } catch (pathError) {
          console.log(`Failed to load from ${path}:`, pathError);
          continue;
        }
      }
      
      console.error('Could not load data from any path');
    } catch (error) {
      console.error('Error loading JSON file:', error);
    }
  }

  parseJSONData(data: any) {
    try {
      // Handle different JSON structures
      let chemicalArray: any[] = [];
      
      if (Array.isArray(data)) {
        chemicalArray = data;
      } else if (data.chemicals && Array.isArray(data.chemicals)) {
        chemicalArray = data.chemicals;
      } else if (data.data && Array.isArray(data.data)) {
        chemicalArray = data.data;
      } else {
        // Try to extract chemicals from OWL-like structure
        chemicalArray = this.extractChemicalsFromOWL(data);
      }

      // Convert to our Chemical interface
      this.chemicals = chemicalArray.map((item, index) => ({
        id: item.id || index + 1,
        name: item.name || item.label || item.title || String(item)
      })).filter(chemical => chemical.name && chemical.name.trim() !== '');

      console.log(`Loaded ${this.chemicals.length} chemicals from JSON`);
    } catch (error) {
      console.error('Error parsing JSON data:', error);
    }
  }

  extractChemicalsFromOWL(data: any): any[] {
    const chemicals: any[] = [];
    
    try {
      // Common OWL/RDF structures
      if (data['@graph']) {
        return data['@graph'].filter((item: any) => 
          item['@type'] && (
            item['@type'].includes('Chemical') || 
            item['@type'].includes('Compound') ||
            item['rdfs:label'] || 
            item['skos:prefLabel']
          )
        ).map((item: any) => ({
          name: item['rdfs:label'] || item['skos:prefLabel'] || item['@id']
        }));
      }
      
      // Recursive search for chemical-like objects
      const searchForChemicals = (obj: any, depth = 0): void => {
        if (depth > 10) return; // Prevent infinite recursion
        
        if (typeof obj === 'object' && obj !== null) {
          // Check if this object looks like a chemical
          if ((obj.name || obj.label || obj.title) && 
              (typeof obj.name === 'string' || typeof obj.label === 'string' || typeof obj.title === 'string')) {
            chemicals.push({
              name: obj.name || obj.label || obj.title
            });
          }
          
          // Recursively search nested objects
          Object.values(obj).forEach(value => {
            if (Array.isArray(value)) {
              value.forEach(item => searchForChemicals(item, depth + 1));
            } else if (typeof value === 'object') {
              searchForChemicals(value, depth + 1);
            }
          });
        }
      };
      
      searchForChemicals(data);
    } catch (error) {
      console.error('Error extracting chemicals from OWL data:', error);
    }
    
    return chemicals;
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

  clearSearch() {
    this.searchTerm = '';
    this.filteredChemicals = [...this.chemicals];
  }

  onChemicalClick(chemical: Chemical) {
    console.log('Navigating to chemical details for:', chemical.name);
    this.router.navigate(['/chemical-details', chemical.id]).then(
      success => console.log('Navigation successful:', success),
      error => {
        console.error('Navigation failed, trying fallback:', error);
        this.router.navigate(['/tabs/tab4', chemical.id]);
      }
    );
  }

  goBack() {
    this.router.navigate(['/tabs/tab1']);
  }

  async loadOWLDatabase() {
    try {
      this.isLoading = true;
      await this.databaseService.loadOWLData('/assets/data/json_database');
      await this.loadChemicals();
    } catch (error) {
      console.error('Error loading OWL database:', error);
      // Try direct file loading as fallback
      await this.loadFromJSONFile();
      this.isLoading = false;
    }
  }

  navigateToHistory() {
    console.log('History feature coming soon');
  }

  navigateToProfile() {
    console.log('Profile feature coming soon');
  }
}

// Export alias for compatibility
export class Tab3Page extends ChemicalListPage {}