import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DatabaseService, AllDataItem } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSearchbar, IonSpinner, IonButton } from '@ionic/angular/standalone';

interface StepGroup {
  category: string;
  steps: string[];
  isChemicalInfo?: boolean;
}

@Component({
  selector: 'app-emergency-steps',
  templateUrl: './emergency-steps.page.html',
  styleUrls: ['./emergency-steps.page.scss'],
  standalone: true,
  imports: [IonSpinner, 
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonSearchbar
  ]
})
export class EmergencyStepsPage implements OnInit, OnDestroy {
  chemicalId: string = '';
  chemicalName: string = '';
  searchQuery: string = '';
  allStepGroups: StepGroup[] = [];
  filteredSteps: StepGroup[] = [];
  hasData: boolean = false;
  isLoading: boolean = true;
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();

  private chemicalAliases: { [key: string]: string[] } = {
    'Activated Carbon': ['Activated Charcoal', 'Activated Charcoal Powder'],
    'Acetone': ['2-propanone', 'Dimethyl Ketone', 'Dimethylformaldehyde', 'Pyroacetic Acid'],
    'Acetic Acid': ['Glacial Acetic Acid'],
    'Aluminum Oxide': ['Alpha-alumina', 'Aluminia', 'Aluminum Oxide Powder'],
    '3,5-Dinitrosalicylic Acid': ['2-hydroxy-3,5-dinitrobenzoic Acid'],
  };

  private nonBulletedProperties = [
    'hasHealthLevel',
    'hasPhysicalHazards', 
    'hasPolymerization',
    'hasStabilityAtNormalConditions',
    'hasFlammabilityLevel',
    'hasInstabilityOrReactivityLevel'
  ];

  // Chemical information properties
  private chemicalInfoProperties = [
    'hasFlammabilityLevel',
    'hasHealthLevel',
    'hasInstabilityOrReactivityLevel',
    'hasPhysicalHazards',
    'hasStabilityAtNormalConditions',
    'hasPolymerization',
    'hasIncompatibilityIssuesWith',
    'hasReactivityWith'
  ];

  // Predefined Accidental General procedures
  private accidentalGeneralSteps = [
    'Absorb with Inert Dry Material',
    'Call for Assistance of Disposal',
    'Keep Away from Ignition or Heat',
    'Never Touch',
    'Prevent Entry to Basements',
    'Prevent Entry to Confined Areas',
    'Prevent Entry to Sewers',
    'Prevent Water Inside Container',
    'Stop leak if safe',
    'Water spray to dampen',
    'Absorb with Inert Dry Material',
    'Dilute with Water and Dispose According to Authority Requirements',
    'Place in Appropriate Disposal'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private platform: Platform,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.chemicalId = params['chemicalId'] || '';
      this.chemicalName = params['chemicalName'] || '';
      
      console.log('Chemical ID:', this.chemicalId);
      console.log('Chemical Name:', this.chemicalName);
      
      this.loadEmergencySteps();
    });

    // Handle Android back button
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.goBack();
    });

    // Subscribe to database loading state
    this.dataSubscription = this.databaseService.allData$.subscribe(data => {
      if (data && data.length > 0) {
        console.log('Database data received, reloading steps');
        this.loadEmergencySteps();
      }
    });
  }

  ngOnDestroy() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  private loadEmergencySteps() {
    this.isLoading = true;
    
    try {
      const allData = this.databaseService.getCurrentAllData();
      console.log('All data length:', allData.length);
      
      if (allData && allData.length > 0) {
        const chemical = this.findChemicalData(allData);
        console.log('Found chemical:', chemical);
        
        if (chemical && chemical.data) {
          console.log('Chemical data keys:', Object.keys(chemical.data));
          this.allStepGroups = this.extractAllInformation(chemical.data);
          this.hasData = this.allStepGroups.length > 0;
          console.log('Extracted step groups:', this.allStepGroups.length);
          console.log('Step groups:', this.allStepGroups);
        } else {
          this.hasData = false;
          this.allStepGroups = [];
          console.log('No chemical data found');
        }
      } else {
        this.hasData = false;
        this.allStepGroups = [];
        console.log('No database data available');
      }
      
      this.isLoading = false;
      this.applySearch();
      
    } catch (error) {
      console.error('Error loading emergency steps:', error);
      this.hasData = false;
      this.allStepGroups = [];
      this.isLoading = false;
      this.applySearch();
    }
  }

  private findChemicalData(allData: AllDataItem[]): AllDataItem | null {
    console.log('Looking for chemical with ID:', this.chemicalId, 'Name:', this.chemicalName);
    
    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      (item.id === this.chemicalId || item.id === `id#${this.chemicalId}`)
    );

    if (chemical) {
      console.log('Found by ID:', chemical.id);
      return chemical;
    }

    if (this.chemicalName) {
      const searchName = this.normalizeChemicalName(this.chemicalName);
      console.log('Normalized search name:', searchName);
      
      chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        
        const itemName = this.normalizeChemicalName(item.name || '');
        const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
        
        console.log('Comparing with item:', itemName, 'ID:', itemId);
        
        return itemName === searchName || itemId === searchName;
      });

      if (chemical) {
        console.log('Found by name:', chemical.name);
        return chemical;
      }

      const mainChemicalName = this.getMainChemicalName(this.chemicalName);
      if (mainChemicalName !== this.chemicalName) {
        const aliasSearchName = this.normalizeChemicalName(mainChemicalName);
        console.log('Trying alias search:', aliasSearchName);
        
        chemical = allData.find((item: AllDataItem) => {
          if (item.type !== 'chemical') return false;
          
          const itemName = this.normalizeChemicalName(item.name || '');
          const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
          
          return itemName === aliasSearchName || itemId === aliasSearchName;
        });
        
        if (chemical) {
          console.log('Found by alias:', chemical.name);
          return chemical;
        }
      }
    }

    // Debug: List all available chemicals
    const chemicals = allData.filter(item => item.type === 'chemical');
    console.log('Available chemicals:', chemicals.map(c => ({ id: c.id, name: c.name })));

    return null;
  }

  private normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  
      .trim();
  }

  private getMainChemicalName(name: string): string {
    for (const [mainName, aliases] of Object.entries(this.chemicalAliases)) {
      if (mainName.toLowerCase() === name.toLowerCase() || 
          aliases.some(alias => alias.toLowerCase() === name.toLowerCase())) {
        return mainName;
      }
    }
    return name;
  }

  private extractAllInformation(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    console.log('Extracting information from data:', Object.keys(data));
    
    const chemicalInfo = this.extractChemicalInformation(data);
    if (chemicalInfo.steps.length > 0) {
      stepGroups.push(chemicalInfo);
    }

    const emergencyMapping: { [key: string]: string } = {
      'id#hasFirstAidEye': 'Eye Contact First Aid',
      'hasFirstAidEye': 'Eye Contact First Aid',
      'id#hasFirstAidIngestion': 'Ingestion First Aid',
      'hasFirstAidIngestion': 'Ingestion First Aid',
      'id#hasFirstAidInhalation': 'Inhalation First Aid',
      'hasFirstAidInhalation': 'Inhalation First Aid',
      'id#hasFirstAidSkin': 'Skin Contact First Aid',
      'hasFirstAidSkin': 'Skin Contact First Aid',
      'id#hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'id#hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'id#hasFirstAidGeneral': 'General First Aid',
      'hasFirstAidGeneral': 'General First Aid',
      'id#hasSmallSpill': 'Small Spill Procedures',
      'hasSmallSpill': 'Small Spill Procedures',
      'id#hasLargeSpill': 'Large Spill Procedures',
      'hasLargeSpill': 'Large Spill Procedures',
      'id#hasSmallFireFighting': 'Small Fire Fighting',
      'hasSmallFireFighting': 'Small Fire Fighting',
      'id#hasLargeFireFighting': 'Large Fire Fighting',
      'hasLargeFireFighting': 'Large Fire Fighting',
      'id#hasConditionsOfInstability': 'Conditions of Instability',
      'hasConditionsOfInstability': 'Conditions of Instability',
      'id#hasAccidentalGeneral': 'General Accident Procedures',
      'hasAccidentalGeneral': 'General Accident Procedures'
    };

    for (const [prop, categoryName] of Object.entries(emergencyMapping)) {
      if (data[prop]) {
        console.log(`Found property ${prop}:`, data[prop]);
        let steps: string[] = [];
        
        // Handle Accidental General with predefined steps
        if (prop.includes('AccidentalGeneral')) {
          steps = this.accidentalGeneralSteps.map(step => `• ${step}`);
        } else {
          steps = this.extractStepsFromProperty(data[prop], prop);
        }
        
        if (steps.length > 0) {
          stepGroups.push({ 
            category: categoryName, 
            steps: steps,
            isChemicalInfo: false
          });
        }
      }
    }

    console.log('Total step groups extracted:', stepGroups.length);
    return stepGroups;
  }

  private extractChemicalInformation(data: any): StepGroup {
    const steps: string[] = [];

    const flammabilityKeys = ['id#hasFlammabilityLevel', 'hasFlammabilityLevel'];
    for (const key of flammabilityKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          steps.push(`Flammability Level: ${level}`);
          break;
        }
      }
    }

    const healthKeys = ['id#hasHealthLevel', 'hasHealthLevel'];
    for (const key of healthKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          steps.push(`Health Level: ${level}`);
          break;
        }
      }
    }

    const instabilityKeys = ['id#hasInstabilityOrReactivityLevel', 'hasInstabilityOrReactivityLevel'];
    for (const key of instabilityKeys) {
      if (data[key]) {
        const level = this.extractSimpleValue(data[key]);
        if (level) {
          steps.push(`Instability/Reactivity Level: ${level}`);
          break;
        }
      }
    }

    const physicalHazardKeys = ['id#hasPhysicalHazards', 'hasPhysicalHazards'];
    for (const key of physicalHazardKeys) {
      if (data[key]) {
        const hazards = this.extractStepsFromProperty(data[key], key);
        if (hazards.length > 0) {
          steps.push('Physical Hazards:');
          hazards.forEach(hazard => steps.push(hazard));
        }
        break;
      }
    }

    const stabilityKeys = ['id#hasStabilityAtNormalConditions', 'hasStabilityAtNormalConditions'];
    for (const key of stabilityKeys) {
      if (data[key]) {
        const stability = this.extractSimpleValue(data[key]);
        if (stability) {
          steps.push(`Stability at Normal Conditions: ${stability}`);
          break;
        }
      }
    }

    const polymerizationKeys = ['id#hasPolymerization', 'hasPolymerization'];
    for (const key of polymerizationKeys) {
      if (data[key]) {
        const polymerization = this.extractSimpleValue(data[key]);
        if (polymerization) {
          steps.push(`Polymerization: ${polymerization}`);
          break;
        }
      }
    }

    const incompatibilityKeys = ['id#hasIncompatibilityIssuesWith', 'hasIncompatibilityIssuesWith'];
    for (const key of incompatibilityKeys) {
      if (data[key]) {
        const incompatibles = this.extractStepsFromProperty(data[key], key);
        if (incompatibles.length > 0) {
          steps.push(`Incompatible Materials:`);
          incompatibles.forEach(item => steps.push(item));
        }
        break;
      }
    }

    const reactivityKeys = ['id#hasReactivityWith', 'hasReactivityWith'];
    for (const key of reactivityKeys) {
      if (data[key]) {
        const reactives = this.extractStepsFromProperty(data[key], key);
        if (reactives.length > 0) {
          steps.push(`Reactive With:`);
          reactives.forEach(item => steps.push(item));
        }
        break;
      }
    }

    return {
      category: 'Chemical Information',
      steps: steps,
      isChemicalInfo: true
    };
  }

  private extractStepsFromProperty(property: any, propName: string): string[] {
    const steps: string[] = [];
    const shouldBeBulleted = !this.nonBulletedProperties.some(p => propName.includes(p));
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        const stepText = this.extractSingleValue(item);
        if (stepText && stepText.trim().length > 0) {
          // Remove "Post " prefix and clean up the text
          const cleanedText = this.cleanStepText(stepText);
          steps.push(shouldBeBulleted ? `• ${cleanedText}` : cleanedText);
        }
      });
    } else {
      const stepText = this.extractSingleValue(property);
      if (stepText && stepText.trim().length > 0) {
        // Remove "Post " prefix and clean up the text
        const cleanedText = this.cleanStepText(stepText);
        steps.push(shouldBeBulleted ? `• ${cleanedText}` : cleanedText);
      }
    }
    
    return steps;
  }

  private cleanStepText(text: string): string {
    // Remove "Post " prefix if it exists
    let cleaned = text.replace(/^Post\s+/i, '');
    
    // Fix "Phys Haz" to "Physical Hazards"
    cleaned = cleaned.replace(/Phys\s+Haz/gi, 'Physical Hazards');
    
    // Remove "Fire Fighting " prefix from fire fighting instructions
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
      this.filteredSteps = [...this.allStepGroups];
    } else {
      this.filteredSteps = this.allStepGroups.filter(group =>
        group.category.toLowerCase().includes(this.searchQuery) ||
        group.steps.some(step => step.toLowerCase().includes(this.searchQuery))
      );
    }
  }

  goBack() {
    this.router.navigate(['/chemical-list']);
  }

  navigateToHome() {
    this.router.navigate(['/emergency-types']);
  }

  navigateToChemicals() {
    this.router.navigate(['/chemical-list']);
  }

  navigateToHistory() {
    console.log('History feature coming soon');
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}