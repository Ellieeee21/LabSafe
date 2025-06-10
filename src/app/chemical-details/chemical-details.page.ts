import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Chemical, AllDataItem } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonButton, IonIcon, IonSpinner, IonBackButton, IonButtons,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  homeOutline, flaskOutline, timeOutline, personOutline, arrowBackOutline
} from 'ionicons/icons';
import { ChemicalAliasesService } from '../services/chemical-aliases.service';

interface ChemicalInfoSection {
  title: string;
  content: string[];
}

@Component({
  selector: 'app-chemical-details',
  templateUrl: './chemical-details.page.html',
  styleUrls: ['./chemical-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardContent, IonIcon, IonSpinner, IonText
  ]
})
export class ChemicalDetailsPage implements OnInit {
  chemical: Chemical | null = null;
  chemicalInfoSections: ChemicalInfoSection[] = [];
  isLoading = true;
  error: string | null = null;

constructor(
  private route: ActivatedRoute,
  private router: Router,
  private databaseService: DatabaseService,
  private chemicalAliasesService: ChemicalAliasesService
) {
  addIcons({ 
    homeOutline, flaskOutline, timeOutline, personOutline, arrowBackOutline
  });
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
      
      const numericId = parseInt(chemicalId, 10);
      
      if (isNaN(numericId)) {
        this.error = 'Invalid chemical ID format';
        return;
      }
      
      this.chemical = this.getChemicalById(numericId);
      
      if (!this.chemical) {
        this.error = 'Chemical not found';
      } else {
        await this.loadChemicalInformation();
      }
      
    } catch (error) {
      console.error('Error loading chemical details:', error);
      this.error = 'Failed to load chemical details';
    } finally {
      this.isLoading = false;
    }
  }

private async getMainChemicalName(name: string): Promise<string> {
  return await this.chemicalAliasesService.getMainChemicalName(name);
}

  private getChemicalById(id: number): Chemical | null {
    const chemicals = this.databaseService.getChemicals();
    return chemicals.find(chemical => chemical.id === id) || null;
  }

  private async loadChemicalInformation() {
  try {
    const allData = this.databaseService.getCurrentAllData();
    console.log('All data length:', allData.length);
    
    if (allData && allData.length > 0 && this.chemical) {
      let chemicalData = await this.findChemicalData(allData, this.chemical.name);
      
      if (!chemicalData) {
        const relatedChemicals = await this.getAllPossibleNamesForChemical(this.chemical.name);
        console.log('Looking for related chemicals:', relatedChemicals);
        
        for (const relatedName of relatedChemicals) {
          chemicalData = await this.findChemicalData(allData, relatedName);
          if (chemicalData) {
            console.log('Found data using related chemical:', relatedName);
            break;
          }
        }
      }
      
      if (chemicalData && chemicalData.data) {
        this.chemicalInfoSections = await this.extractChemicalInformation(chemicalData.data);
      } else {
        this.chemicalInfoSections = [];
      }
    } else {
      this.chemicalInfoSections = [];
    }
  } catch (error) {
    console.error('Error loading chemical information:', error);
    this.chemicalInfoSections = [];
  }
}

  private async findChemicalData(allData: AllDataItem[], chemicalName: string): Promise<AllDataItem | null> {
  console.log('Looking for chemical with name:', chemicalName);
  
  let chemical = allData.find(item => 
    item.type === 'chemical' && 
    item.name && item.name.toLowerCase() === chemicalName.toLowerCase()
  );
  
  if (chemical) return chemical;

  const allPossibleNames = await this.getAllPossibleNamesForChemical(chemicalName);
  for (const possibleName of allPossibleNames) {
    chemical = allData.find(item => 
      item.type === 'chemical' && 
      item.name && item.name.toLowerCase() === possibleName.toLowerCase()
    );
    if (chemical) return chemical;

    const normalizedPossible = this.normalizeChemicalName(possibleName);
    chemical = allData.find(item => {
      if (item.type !== 'chemical') return false;
      const itemName = this.normalizeChemicalName(item.name || '');
      const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
      return itemName === normalizedPossible || itemId === normalizedPossible;
    });
    if (chemical) return chemical;
  }

  return null;
}


 private generatePotentialIds(chemicalName: string): string[] {
  const potentialIds: string[] = [];
  
  const cleanName = chemicalName
    .replace(/[,\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  potentialIds.push(cleanName);
  
  if (chemicalName.includes(',')) {
    const parts = chemicalName.split(',').map(part => part.trim());
    const joinedWithDots = parts.join('..');
    potentialIds.push(joinedWithDots);
    
    const capitalizedParts = parts.map(part => 
      part.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('')
    );
    potentialIds.push(capitalizedParts.join('..'));
  }
  
  const withNumbers = cleanName.replace(/(\d+)/g, '$1');
  if (withNumbers !== cleanName) {
    potentialIds.push(withNumbers);
  }
  
  return potentialIds;
}

 private async getAllPossibleNamesForChemical(chemicalName: string): Promise<string[]> {
  return await this.chemicalAliasesService.getAllPossibleNamesForChemical(chemicalName);
}

public normalizeChemicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

  private async extractChemicalInformation(data: any): Promise<ChemicalInfoSection[]> {
  const sections: ChemicalInfoSection[] = [];

  // Health Level
  const healthKeys = ['id#hasHealthLevel', 'hasHealthLevel'];
  for (const key of healthKeys) {
    if (data[key]) {
      const level = this.extractSimpleValue(data[key]);
      if (level) {
        sections.push({
          title: 'Health Level',
          content: [this.cleanStepText(level)]
        });
        break;
        }
      }
    }

    // Flammability Level
    const flammabilityKeys = ['id#hasFlammabilityLevel', 'hasFlammabilityLevel'];
    for (const key of flammabilityKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          sections.push({
            title: 'Flammability Level',
            content: [this.cleanStepText(level)]
          });
          break;
        }
      }
    }

    // Instability/Reactivity Level
    const instabilityKeys = ['id#hasInstabilityOrReactivityLevel', 'hasInstabilityOrReactivityLevel'];
    for (const key of instabilityKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          sections.push({
            title: 'Instability/Reactivity Level',
            content: [this.cleanStepText(level)]
          });
          break;
        }
      }
    }

    // Physical Hazards
    const physicalHazardKeys = ['id#hasPhysicalHazards', 'hasPhysicalHazards'];
    for (const key of physicalHazardKeys) {
      if (data[key]) {
        const hazards = this.extractStepsFromProperty(data[key], key);
        if (hazards.length > 0) {
          sections.push({
            title: 'Physical Hazards',
            content: hazards
          });
        }
        break;
      }
    }

    // Health Hazards
    const healthHazardKeys = ['id#hasHealthHazards', 'hasHealthHazards'];
    for (const key of healthHazardKeys) {
      if (data[key]) {
        const hazards = this.extractStepsFromProperty(data[key], key);
        if (hazards.length > 0) {
          sections.push({
            title: 'Health Hazards',
            content: hazards
          });
        }
        break;
      }
    }

    // Stability Info
    const stabilityKeys = ['id#hasStabilityAtNormalConditions', 'hasStabilityAtNormalConditions'];
    for (const key of stabilityKeys) {
      if (data[key]) {
        const stability = this.extractSimpleValue(data[key]);
        if (stability) {
          sections.push({
            title: 'Stability Info',
            content: [this.cleanStepText(stability)]
          });
          break;
        }
      }
    }

    // Conditions of Instability
    const instabilityConditionKeys = ['id#hasConditionsOfInstability', 'hasConditionsOfInstability'];
    for (const key of instabilityConditionKeys) {
      if (data[key]) {
        const conditions = this.extractStepsFromProperty(data[key], key);
        if (conditions.length > 0) {
          sections.push({
            title: 'Conditions of Instability',
            content: conditions
          });
        }
        break;
      }
    }

    // Incompatible Materials
    const incompatibilityKeys = ['id#hasIncompatibilityIssuesWith', 'hasIncompatibilityIssuesWith'];
    for (const key of incompatibilityKeys) {
      if (data[key]) {
        const incompatibles = this.extractStepsFromProperty(data[key], key);
        if (incompatibles.length > 0) {
          sections.push({
            title: 'Incompatible Materials',
            content: incompatibles
          });
        }
        break;
      }
    }

    // Reactive Substances
    const reactivityKeys = ['id#hasReactivityWith', 'hasReactivityWith'];
    for (const key of reactivityKeys) {
      if (data[key]) {
        const reactives = this.extractStepsFromProperty(data[key], key);
        if (reactives.length > 0) {
          sections.push({
            title: 'Reactive Substances',
            content: reactives
          });
        }
        break;
      }
    }

    // Polymerization
    const polymerizationKeys = ['id#hasPolymerization', 'hasPolymerization'];
    for (const key of polymerizationKeys) {
      if (data[key]) {
        const polymerization = this.extractSimpleValue(data[key]);
        if (polymerization) {
          sections.push({
            title: 'Polymerization',
            content: [this.cleanStepText(polymerization)]
          });
          break;
        }
      }
    }

    return sections;
  }

  private extractStepsFromProperty(property: any, propName: string): string[] {
    const steps: string[] = [];
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        const stepText = this.extractSingleValue(item);
        if (stepText && stepText.trim().length > 0) {
          const cleanedText = this.cleanStepText(stepText);
          steps.push(cleanedText);
        }
      });
    } else {
      const stepText = this.extractSingleValue(property);
      if (stepText && stepText.trim().length > 0) {
        const cleanedText = this.cleanStepText(stepText);
        steps.push(cleanedText);
      }
    }
    
    return steps;
  }

  private cleanStepText(text: string): string {
    let cleaned = text.replace(/^Post\s+/i, '');
    cleaned = cleaned.replace(/Phys\s+Haz/gi, 'Physical Hazards');
    cleaned = cleaned.replace(/Health\s+Haz/gi, 'Health Hazards');
    cleaned = cleaned.replace(/^Fire\s+Fighting\s+/i, '');
    
    return cleaned;
  }

  private extractSingleValue(item: any): string {
    if (!item) return '';
    
    if (typeof item === 'string') {
      return item;
    }
    
    if (typeof item === 'object') {
      if (item['@id']) {
        return this.formatIdValue(item['@id']);
      }
      
      if (item['@value']) {
        return item['@value'];
      }
      
      if (item.value) {
        return item.value;
      }
      
      if (item['http://www.w3.org/2000/01/rdf-schema#label']) {
        const label = item['http://www.w3.org/2000/01/rdf-schema#label'];
        if (typeof label === 'string') return label;
        if (Array.isArray(label) && label.length > 0) {
          return typeof label[0] === 'string' ? label[0] : (label[0]['@value'] || '');
        }
        if (label['@value']) return label['@value'];
      }
    }
    
    return '';
  }

  private extractSimpleValue(property: any): string {
    if (Array.isArray(property) && property.length > 0) {
      return this.extractSingleValue(property[0]);
    } else {
      return this.extractSingleValue(property);
    }
  }

  private formatIdValue(id: string): string {
    if (!id) return '';
    
    return id
      .replace('id#', '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9])([A-Z])/g, '$1 $2')
      .replace(/\.\./g, ', ')
      .trim();
  }

  // Navigation methods
  navigateToHome() {
    console.log('Navigating to emergency types...');
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    console.log('Navigating to chemical list...');
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
    // TODO: Implement history navigation when ready
  }

  navigateToProfile() {
    console.log('Navigating to profile...');
    this.router.navigate(['/profile']);
  }

  goBack() {
    console.log('Going back to chemical list...');
    this.navigateToChemicals();
  }
}