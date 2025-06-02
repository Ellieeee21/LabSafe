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
          this.allStepGroups = this.extractAllInformation(chemical.data);
          this.hasData = this.allStepGroups.length > 0;
          console.log('Extracted step groups:', this.allStepGroups.length);
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
    
    // First try exact ID match
    let chemical = allData.find((item: AllDataItem) => 
      item.type === 'chemical' && 
      (item.id === this.chemicalId || item.id === `id#${this.chemicalId}`)
    );

    if (chemical) {
      console.log('Found by ID:', chemical.id);
      return chemical;
    }

    // Try name-based matching with normalization
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

      // Try alias matching
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
      .replace(/[^a-z0-9]/g, '')  // Remove all non-alphanumeric characters
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
    
    // Extract chemical information first
    const chemicalInfo = this.extractChemicalInformation(data);
    if (chemicalInfo.steps.length > 0) {
      stepGroups.push(chemicalInfo);
    }

    // Map of property names to display names
    const emergencyMapping: { [key: string]: string } = {
      'hasFirstAidEye': 'Eye Contact First Aid',
      'hasFirstAidIngestion': 'Ingestion First Aid',
      'hasFirstAidInhalation': 'Inhalation First Aid',
      'hasFirstAidSkin': 'Skin Contact First Aid',
      'hasFirstAidSeriousInhalation': 'Serious Inhalation First Aid',
      'hasFirstAidSeriousSkin': 'Serious Skin Contact First Aid',
      'hasFirstAidGeneral': 'General First Aid',
      'hasSmallSpill': 'Small Spill Procedures',
      'hasLargeSpill': 'Large Spill Procedures',
      'hasSmallFireFighting': 'Small Fire Fighting',
      'hasLargeFireFighting': 'Large Fire Fighting',
      'hasConditionsOfInstability': 'Conditions of Instability',
      'hasAccidentalGeneral': 'General Accident Procedures'
    };

    // Process each emergency property
    for (const [prop, categoryName] of Object.entries(emergencyMapping)) {
      if (data[prop]) {
        console.log(`Found property ${prop}:`, data[prop]);
        const steps = this.extractStepsFromProperty(data[prop], prop);
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

    // Extract flammability level
    if (data['hasFlammabilityLevel']) {
      const level = this.extractSimpleValue(data['hasFlammabilityLevel']);
      if (level) steps.push(`Flammability Level: ${level}`);
    }

    // Extract health level
    if (data['hasHealthLevel']) {
      const level = this.extractSimpleValue(data['hasHealthLevel']);
      if (level) steps.push(`Health Level: ${level}`);
    }

    // Extract instability/reactivity level
    if (data['hasInstabilityOrReactivityLevel']) {
      const level = this.extractSimpleValue(data['hasInstabilityOrReactivityLevel']);
      if (level) steps.push(`Instability/Reactivity Level: ${level}`);
    }

    // Extract physical hazards
    if (data['hasPhysicalHazards']) {
      const hazards = this.extractStepsFromProperty(data['hasPhysicalHazards'], 'hasPhysicalHazards');
      hazards.forEach(hazard => steps.push(hazard));
    }

    // Extract stability information
    if (data['hasStabilityAtNormalConditions']) {
      const stability = this.extractSimpleValue(data['hasStabilityAtNormalConditions']);
      if (stability) steps.push(`Stability at Normal Conditions: ${stability}`);
    }

    // Extract polymerization information
    if (data['hasPolymerization']) {
      const polymerization = this.extractSimpleValue(data['hasPolymerization']);
      if (polymerization) steps.push(`Polymerization: ${polymerization}`);
    }

    // Extract incompatibility information
    if (data['hasIncompatibilityIssuesWith']) {
      const incompatibles = this.extractStepsFromProperty(data['hasIncompatibilityIssuesWith'], 'hasIncompatibilityIssuesWith');
      if (incompatibles.length > 0) {
        steps.push(`Incompatible Materials:`);
        incompatibles.forEach(item => steps.push(`• ${item}`));
      }
    }

    // Extract reactivity information
    if (data['hasReactivityWith']) {
      const reactives = this.extractStepsFromProperty(data['hasReactivityWith'], 'hasReactivityWith');
      if (reactives.length > 0) {
        steps.push(`Reactive With:`);
        reactives.forEach(item => steps.push(`• ${item}`));
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
    const shouldBeBulleted = !this.nonBulletedProperties.includes(propName);
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        const stepText = this.extractSingleValue(item);
        if (stepText && stepText.trim().length > 0) {
          steps.push(shouldBeBulleted ? `• ${stepText}` : stepText);
        }
      });
    } else {
      const stepText = this.extractSingleValue(property);
      if (stepText && stepText.trim().length > 0) {
        steps.push(shouldBeBulleted ? `• ${stepText}` : stepText);
      }
    }
    
    return steps;
  }

  private extractSingleValue(item: any): string {
    if (!item) return '';
    
    if (typeof item === 'string') {
      return item;
    }
    
    if (typeof item === 'object') {
      // Handle JSON-LD @id references
      if (item['@id']) {
        return this.formatIdValue(item['@id']);
      }
      
      // Handle objects with @value
      if (item['@value']) {
        return item['@value'];
      }
      
      // Handle plain objects
      if (item.value) {
        return item.value;
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