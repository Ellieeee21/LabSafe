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
  emergencyType: string = '';
  emergencyId: string = '';
  searchQuery: string = '';
  allStepGroups: StepGroup[] = [];
  filteredSteps: StepGroup[] = [];
  hasData: boolean = false;
  isLoading: boolean = true;
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();

  private emergencyTypeMapping: { [key: string]: string[] } = {
    'Eye Contact': ['id#hasFirstAidEye', 'hasFirstAidEye'],
    'Fire Fighting': ['id#hasSmallFireFighting', 'hasSmallFireFighting', 'id#hasLargeFireFighting', 'hasLargeFireFighting'],
    'Ingestion': ['id#hasFirstAidIngestion', 'hasFirstAidIngestion'],
    'Inhalation': ['id#hasFirstAidInhalation', 'hasFirstAidInhalation', 'id#hasFirstAidSeriousInhalation', 'hasFirstAidSeriousInhalation'],
    'Skin Contact': ['id#hasFirstAidSkin', 'hasFirstAidSkin', 'id#hasFirstAidSeriousSkin', 'hasFirstAidSeriousSkin'],
    'Spill': ['id#hasSmallSpill', 'hasSmallSpill', 'id#hasLargeSpill', 'hasLargeSpill', 'id#hasAccidentalGeneral', 'hasAccidentalGeneral']
  };

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
      this.emergencyType = params['emergencyType'] || '';
      this.emergencyId = params['emergencyId'] || '';
      
      console.log('Chemical ID:', this.chemicalId);
      console.log('Chemical Name:', this.chemicalName);
      console.log('Emergency Type:', this.emergencyType);
      console.log('Emergency ID:', this.emergencyId);
      
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
        // Find all related chemicals (including aliases)
        const relatedChemicals = this.findAllRelatedChemicals(allData);
        console.log('Found related chemicals:', relatedChemicals.map(c => c.name || c.id));
        
        if (relatedChemicals.length > 0) {
          // Combine emergency procedures from all related chemicals
          this.allStepGroups = this.extractCombinedEmergencyProcedures(relatedChemicals);
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

  private findAllRelatedChemicals(allData: AllDataItem[]): AllDataItem[] {
    const relatedChemicals: AllDataItem[] = [];
    const processedIds: Set<string> = new Set();
    
    // First, find the primary chemical
    const primaryChemical = this.findChemicalData(allData);
    if (!primaryChemical) {
      return [];
    }
    
    // Use BFS to find all related chemicals through owl:sameAs relationships
    const queue: AllDataItem[] = [primaryChemical];
    
    while (queue.length > 0) {
      const currentChemical = queue.shift()!;
      const currentId = currentChemical.id;
      
      if (processedIds.has(currentId)) {
        continue;
      }
      
      processedIds.add(currentId);
      relatedChemicals.push(currentChemical);
      
      // Find chemicals that reference this one via owl:sameAs
      const referencingChemicals = this.findReferencingChemicals(allData, currentId);
      for (const refChem of referencingChemicals) {
        if (!processedIds.has(refChem.id)) {
          queue.push(refChem);
        }
      }
      
      // Find chemicals that this one references via owl:sameAs
      const referencedChemicals = this.findReferencedChemicals(allData, currentChemical);
      for (const refChem of referencedChemicals) {
        if (!processedIds.has(refChem.id)) {
          queue.push(refChem);
        }
      }
    }
    
    console.log('Found related chemicals via owl:sameAs:', relatedChemicals.map(c => ({ id: c.id, name: c.name })));
    return relatedChemicals;
  }

  private findReferencingChemicals(allData: AllDataItem[], targetId: string): AllDataItem[] {
    return allData.filter(item => {
      if (item.type !== 'chemical' || !item.data) return false;
      
      const sameAs = item.data['http://www.w3.org/2002/07/owl#sameAs'];
      if (!sameAs) return false;
      
      const sameAsArray = Array.isArray(sameAs) ? sameAs : [sameAs];
      return sameAsArray.some(ref => {
        const refId = typeof ref === 'object' ? ref['@id'] : ref;
        return refId === targetId || refId === `id#${targetId}` || refId === targetId.replace('id#', '');
      });
    });
  }

  private findReferencedChemicals(allData: AllDataItem[], chemical: AllDataItem): AllDataItem[] {
    if (!chemical.data) return [];
    
    const sameAs = chemical.data['http://www.w3.org/2002/07/owl#sameAs'];
    if (!sameAs) return [];
    
    const sameAsArray = Array.isArray(sameAs) ? sameAs : [sameAs];
    const referencedChemicals: AllDataItem[] = [];
    
    for (const ref of sameAsArray) {
      const refId = typeof ref === 'object' ? ref['@id'] : ref;
      const referencedChemical = allData.find(item => 
        item.type === 'chemical' && (
          item.id === refId || 
          item.id === refId.replace('id#', '') || 
          `id#${item.id}` === refId
        )
      );
      
      if (referencedChemical) {
        referencedChemicals.push(referencedChemical);
      }
    }
    
    return referencedChemicals;
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

    // Then try name matching
    if (this.chemicalName) {
      const searchName = this.normalizeChemicalName(this.chemicalName);
      console.log('Normalized search name:', searchName);
      
      chemical = allData.find((item: AllDataItem) => {
        if (item.type !== 'chemical') return false;
        
        // Check direct name match
        const itemName = this.normalizeChemicalName(item.name || '');
        const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
        
        if (itemName === searchName || itemId === searchName) {
          return true;
        }
        
        // Check rdfs:label
        if (item.data && item.data['http://www.w3.org/2000/01/rdf-schema#label']) {
          const labels = item.data['http://www.w3.org/2000/01/rdf-schema#label'];
          const labelArray = Array.isArray(labels) ? labels : [labels];
          
          for (const label of labelArray) {
            const labelValue = typeof label === 'object' ? label['@value'] : label;
            if (labelValue && this.normalizeChemicalName(labelValue) === searchName) {
              return true;
            }
          }
        }
        
        return false;
      });

      if (chemical) {
        console.log('Found by name/label:', chemical.name);
        return chemical;
      }
    }

    const chemicals = allData.filter(item => item.type === 'chemical');
    console.log('Available chemicals:', chemicals.map(c => ({ id: c.id, name: c.name })));

    return null;
  }

  private extractCombinedEmergencyProcedures(chemicals: AllDataItem[]): StepGroup[] {
    const stepGroupsMap: Map<string, StepGroup> = new Map();
    
    for (const chemical of chemicals) {
      if (!chemical.data) continue;
      
      const chemicalStepGroups = this.extractEmergencyProceduresFromChemical(chemical.data);
      
      // Merge step groups
      for (const stepGroup of chemicalStepGroups) {
        const existingGroup = stepGroupsMap.get(stepGroup.category);
        if (existingGroup) {
          // Combine steps and remove duplicates
          const combinedSteps = [...existingGroup.steps, ...stepGroup.steps];
          const uniqueSteps = Array.from(new Set(combinedSteps));
          existingGroup.steps = uniqueSteps;
        } else {
          stepGroupsMap.set(stepGroup.category, { ...stepGroup });
        }
      }
    }
    
    return Array.from(stepGroupsMap.values());
  }

  private extractEmergencyProceduresFromChemical(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    console.log('Extracting emergency procedures for emergency type:', this.emergencyType);
    console.log('Extracting procedures from data:', Object.keys(data));
    
    if (!this.emergencyType) {
      return this.extractAllEmergencyProcedures(data);
    }

    const relevantProperties = this.emergencyTypeMapping[this.emergencyType];
    
    if (!relevantProperties) {
      console.log('No mapping found for emergency type:', this.emergencyType);
      return [];
    }

    console.log('Looking for properties:', relevantProperties);

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

    for (const prop of relevantProperties) {
      if (data[prop] && emergencyMapping[prop]) {
        console.log(`Found property ${prop}:`, data[prop]);
        let steps: string[] = [];
        
        if (prop.includes('AccidentalGeneral')) {
          steps = this.accidentalGeneralSteps.map(step => `• ${step}`);
        } else {
          steps = this.extractStepsFromProperty(data[prop]);
        }
        
        if (steps.length > 0) {
          stepGroups.push({ 
            category: emergencyMapping[prop], 
            steps: steps
          });
        }
      }
    }

    console.log('Emergency procedure groups extracted from this chemical:', stepGroups.length);
    return stepGroups;
  }

  private extractAllEmergencyProcedures(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    console.log('Extracting all emergency procedures from data:', Object.keys(data));
    
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
        
        if (prop.includes('AccidentalGeneral')) {
          steps = this.accidentalGeneralSteps.map(step => `• ${step}`);
        } else {
          steps = this.extractStepsFromProperty(data[prop]);
        }
        
        if (steps.length > 0) {
          stepGroups.push({ 
            category: categoryName, 
            steps: steps
          });
        }
      }
    }

    console.log('Total emergency procedure groups extracted:', stepGroups.length);
    return stepGroups;
  }

  private normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  
      .trim();
  }

  private extractStepsFromProperty(property: any): string[] {
    const steps: string[] = [];
    
    if (Array.isArray(property)) {
      property.forEach(item => {
        const stepText = this.extractSingleValue(item);
        if (stepText && stepText.trim().length > 0) {
          const cleanedText = this.cleanStepText(stepText);
          steps.push(`• ${cleanedText}`);
        }
      });
    } else {
      const stepText = this.extractSingleValue(property);
      if (stepText && stepText.trim().length > 0) {
        const cleanedText = this.cleanStepText(stepText);
        steps.push(`• ${cleanedText}`);
      }
    }
    
    return steps;
  }

  private cleanStepText(text: string): string {
    let cleaned = text.replace(/^Post\s+/i, '');
    cleaned = cleaned.replace(/Phys\s+Haz/gi, 'Physical Hazards');
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
    const queryParams: any = {};
    
    if (this.emergencyType) {
      queryParams.emergencyType = this.emergencyType;
    }
    if (this.emergencyId) {
      queryParams.emergencyId = this.emergencyId;
    }
    
    if (Object.keys(queryParams).length > 0) {
      this.router.navigate(['/chemical-list'], { queryParams });
    } else {
      this.router.navigate(['/chemical-list']);
    }
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