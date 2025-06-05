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

  // Enhanced alias mapping that groups all related chemicals
  private aliasGroups: Map<string, Set<string>> = new Map();
  private chemicalToCanonical: Map<string, string> = new Map();

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
        console.log('Database data received, rebuilding alias map and reloading steps');
        this.buildEnhancedAliasMap(data);
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

  /**
   * Build enhanced alias mapping that properly groups related chemicals
   */
  private buildEnhancedAliasMap(allData: AllDataItem[]) {
    console.log('Building enhanced alias map from JSON-LD data...');
    this.aliasGroups.clear();
    this.chemicalToCanonical.clear();
    
    // First, collect all chemicals and their sameAs relationships
    const sameAsRelationships: Map<string, Set<string>> = new Map();
    
    allData.forEach(item => {
      if (item.type === 'chemical' && item.data) {
        const currentId = item.id;
        const currentName = this.extractChemicalName(item);
        
        // Initialize the set for this chemical
        if (!sameAsRelationships.has(currentId)) {
          sameAsRelationships.set(currentId, new Set([currentId]));
        }
        
        // Add the name as well if it's different from ID
        if (currentName && currentName !== currentId) {
          sameAsRelationships.get(currentId)!.add(currentName);
        }
        
        // Process sameAs relationships
        const sameAsProperty = item.data['http://www.w3.org/2002/07/owl#sameAs'];
        if (sameAsProperty) {
          const sameAsRefs = Array.isArray(sameAsProperty) ? sameAsProperty : [sameAsProperty];
          
          sameAsRefs.forEach(ref => {
            if (ref && ref['@id']) {
              const relatedId = ref['@id'];
              sameAsRelationships.get(currentId)!.add(relatedId);
            }
          });
        }
      }
    });
    
    // Now create unified groups using Union-Find approach
    const visited = new Set<string>();
    
    sameAsRelationships.forEach((relatedIds, chemicalId) => {
      if (!visited.has(chemicalId)) {
        // Find all chemicals that should be in the same group
        const group = new Set<string>();
        const queue = [chemicalId];
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          
          visited.add(current);
          group.add(current);
          
          // Add normalized versions
          group.add(this.normalizeChemicalName(current));
          
          // Find the actual chemical name from the data
          const chemicalItem = allData.find(item => item.id === current);
          if (chemicalItem) {
            const name = this.extractChemicalName(chemicalItem);
            if (name) {
              group.add(name);
              group.add(this.normalizeChemicalName(name));
            }
          }
          
          // Add all related chemicals to the queue
          const related = sameAsRelationships.get(current);
          if (related) {
            related.forEach(relatedId => {
              if (!visited.has(relatedId)) {
                queue.push(relatedId);
              }
            });
          }
        }
        
        // Choose a canonical ID (prefer the one with emergency data)
        let canonicalId = chemicalId;
        for (const id of group) {
          const chemical = allData.find(item => item.id === id);
          if (chemical && chemical.data && this.hasEmergencyData(chemical.data)) {
            canonicalId = id;
            break;
          }
        }
        
        // Store the group
        this.aliasGroups.set(canonicalId, group);
        
        // Map each chemical to its canonical ID
        group.forEach(alias => {
          this.chemicalToCanonical.set(alias, canonicalId);
        });
      }
    });
    
    console.log('Enhanced alias map built with', this.aliasGroups.size, 'groups');
    
    // Debug logging
    this.aliasGroups.forEach((group, canonical) => {
      const groupArray = Array.from(group);
      if (groupArray.some(item => item.toLowerCase().includes('acetone'))) {
        console.log(`Group with canonical "${canonical}":`, groupArray);
      }
    });
  }

  /**
   * Check if chemical data has emergency information
   */
  private hasEmergencyData(data: any): boolean {
    const emergencyProperties = [
      'id#hasFirstAidEye', 'hasFirstAidEye',
      'id#hasFirstAidIngestion', 'hasFirstAidIngestion',
      'id#hasFirstAidInhalation', 'hasFirstAidInhalation',
      'id#hasFirstAidSkin', 'hasFirstAidSkin',
      'id#hasFirstAidSeriousInhalation', 'hasFirstAidSeriousInhalation',
      'id#hasFirstAidSeriousSkin', 'hasFirstAidSeriousSkin',
      'id#hasSmallSpill', 'hasSmallSpill',
      'id#hasLargeSpill', 'hasLargeSpill',
      'id#hasSmallFireFighting', 'hasSmallFireFighting',
      'id#hasLargeFireFighting', 'hasLargeFireFighting',
      'id#hasAccidentalGeneral', 'hasAccidentalGeneral'
    ];
    
    return emergencyProperties.some(prop => data[prop]);
  }

  /**
   * Extract chemical name from item data
   */
  private extractChemicalName(item: AllDataItem): string {
    if (item.name) return item.name;
    
    // Try to extract from rdfs:label
    if (item.data && item.data['http://www.w3.org/2000/01/rdf-schema#label']) {
      const label = item.data['http://www.w3.org/2000/01/rdf-schema#label'];
      if (typeof label === 'string') return label;
      if (Array.isArray(label) && label.length > 0) {
        const firstLabel = label[0];
        if (typeof firstLabel === 'string') return firstLabel;
        if (firstLabel && firstLabel['@value']) return firstLabel['@value'];
      }
      if (label && label['@value']) return label['@value'];
    }
    
    // Fall back to ID without prefix
    return item.id ? item.id.replace('id#', '') : '';
  }

  private loadEmergencySteps() {
    this.isLoading = true;
    
    try {
      const allData = this.databaseService.getCurrentAllData();
      console.log('All data length:', allData.length);
      
      if (allData && allData.length > 0) {
        // Build alias map if not already built
        if (this.aliasGroups.size === 0) {
          this.buildEnhancedAliasMap(allData);
        }
        
        // Find chemical using enhanced alias system
        const chemical = this.findChemicalWithAliases(allData);
        console.log('Found chemical:', chemical);
        
        if (chemical && chemical.data) {
          console.log('Chemical data keys:', Object.keys(chemical.data));
          this.allStepGroups = this.extractEmergencyProcedures(chemical.data);
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

  /**
   * Find chemical using the enhanced alias system
   */
  private findChemicalWithAliases(allData: AllDataItem[]): AllDataItem | null {
    console.log('Looking for chemical with ID:', this.chemicalId, 'Name:', this.chemicalName);
    
    // Create search terms
    const searchTerms = [
      this.chemicalId,
      `id#${this.chemicalId}`,
      this.chemicalName,
      this.normalizeChemicalName(this.chemicalId),
      this.normalizeChemicalName(this.chemicalName)
    ].filter(term => term && term.trim());
    
    console.log('Search terms:', searchTerms);
    
    // Try to find canonical ID for any of our search terms
    let canonicalId: string | null = null;
    
    for (const term of searchTerms) {
      const canonical = this.chemicalToCanonical.get(term);
      if (canonical) {
        canonicalId = canonical;
        console.log(`Found canonical ID "${canonical}" for search term "${term}"`);
        break;
      }
    }
    
    // If we found a canonical ID, look for the chemical with the best data
    if (canonicalId) {
      const group = this.aliasGroups.get(canonicalId);
      if (group) {
        console.log('Searching in alias group:', Array.from(group));
        
        // Look for chemicals in this group that have emergency data
        for (const alias of group) {
          const chemical = allData.find(item => 
            item.type === 'chemical' && 
            (item.id === alias || 
             item.id === `id#${alias}` ||
             this.normalizeChemicalName(this.extractChemicalName(item)) === this.normalizeChemicalName(alias))
          );
          
          if (chemical && chemical.data && this.hasEmergencyData(chemical.data)) {
            console.log('Found chemical with emergency data:', chemical.id);
            return chemical;
          }
        }
        
        // If no chemical with emergency data found, return any chemical from the group
        for (const alias of group) {
          const chemical = allData.find(item => 
            item.type === 'chemical' && 
            (item.id === alias || 
             item.id === `id#${alias}` ||
             this.normalizeChemicalName(this.extractChemicalName(item)) === this.normalizeChemicalName(alias))
          );
          
          if (chemical && chemical.data) {
            console.log('Found chemical from alias group:', chemical.id);
            return chemical;
          }
        }
      }
    }
    
    // Fallback: direct search
    for (const term of searchTerms) {
      const chemical = allData.find(item => 
        item.type === 'chemical' && 
        (item.id === term || 
         item.id === `id#${term}` ||
         this.normalizeChemicalName(this.extractChemicalName(item)) === this.normalizeChemicalName(term))
      );
      
      if (chemical) {
        console.log('Found chemical via direct search:', chemical.id);
        return chemical;
      }
    }
    
    console.log('No chemical found');
    return null;
  }

  private normalizeChemicalName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  
      .trim();
  }

  private extractEmergencyProcedures(data: any): StepGroup[] {
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

    console.log('Total emergency procedure groups extracted:', stepGroups.length);
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