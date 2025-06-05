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
      
      this.loadEmergencySteps();
    });

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.goBack();
    });

    this.dataSubscription = this.databaseService.allData$.subscribe(data => {
      if (data && data.length > 0) {
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

  private buildEnhancedAliasMap(allData: AllDataItem[]) {
    this.aliasGroups.clear();
    this.chemicalToCanonical.clear();
    
    const sameAsRelationships: Map<string, Set<string>> = new Map();
    
    allData.forEach(item => {
      if (item.type === 'chemical' && item.data) {
        const currentId = item.id;
        const currentName = this.extractChemicalName(item);
        
        if (!sameAsRelationships.has(currentId)) {
          sameAsRelationships.set(currentId, new Set([currentId]));
        }
        
        if (currentName && currentName !== currentId) {
          sameAsRelationships.get(currentId)!.add(currentName);
        }
        
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
    
    const visited = new Set<string>();
    
    sameAsRelationships.forEach((relatedIds, chemicalId) => {
      if (!visited.has(chemicalId)) {
        const group = new Set<string>();
        const queue = [chemicalId];
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          
          visited.add(current);
          group.add(current);
          
          group.add(this.normalizeChemicalName(current));
          
          const chemicalItem = allData.find(item => item.id === current);
          if (chemicalItem) {
            const name = this.extractChemicalName(chemicalItem);
            if (name) {
              group.add(name);
              group.add(this.normalizeChemicalName(name));
            }
          }
          
          const related = sameAsRelationships.get(current);
          if (related) {
            related.forEach(relatedId => {
              if (!visited.has(relatedId)) {
                queue.push(relatedId);
              }
            });
          }
        }
        
        let canonicalId = chemicalId;
        for (const id of group) {
          const chemical = allData.find(item => item.id === id);
          if (chemical && chemical.data && this.hasEmergencyData(chemical.data)) {
            canonicalId = id;
            break;
          }
        }
        
        this.aliasGroups.set(canonicalId, group);
        
        group.forEach(alias => {
          this.chemicalToCanonical.set(alias, canonicalId);
        });
      }
    });
  }

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

  private extractChemicalName(item: AllDataItem): string {
    if (item.name) return item.name;
    
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
    
    return item.id ? item.id.replace('id#', '') : '';
  }

  private loadEmergencySteps() {
    this.isLoading = true;
    
    try {
      const allData = this.databaseService.getCurrentAllData();
      
      if (allData && allData.length > 0) {
        if (this.aliasGroups.size === 0) {
          this.buildEnhancedAliasMap(allData);
        }
        
        const chemical = this.findChemicalWithAliases(allData);
        
        if (chemical && chemical.data) {
          this.allStepGroups = this.extractEmergencyProcedures(chemical.data);
          this.hasData = this.allStepGroups.length > 0;
        } else {
          this.hasData = false;
          this.allStepGroups = [];
        }
      } else {
        this.hasData = false;
        this.allStepGroups = [];
      }
      
      this.isLoading = false;
      this.applySearch();
      
    } catch (error) {
      this.hasData = false;
      this.allStepGroups = [];
      this.isLoading = false;
      this.applySearch();
    }
  }

  private findChemicalWithAliases(allData: AllDataItem[]): AllDataItem | null {
    const searchTerms = this.generateSearchTerms();
    
    // First, try to find using alias groups
    for (const term of searchTerms) {
      const normalizedTerm = this.normalizeChemicalName(term);
      
      // Check if this term maps to a canonical chemical
      const canonical = this.chemicalToCanonical.get(term) || this.chemicalToCanonical.get(normalizedTerm);
      if (canonical) {
        const chemical = allData.find(item => item.id === canonical);
        if (chemical && chemical.data) {
          return chemical;
        }
      }
      
      // Check all alias groups for partial matches
      for (const [canonicalId, aliases] of this.aliasGroups.entries()) {
        for (const alias of aliases) {
          if (this.normalizeChemicalName(alias).includes(normalizedTerm) || 
              normalizedTerm.includes(this.normalizeChemicalName(alias))) {
            const chemical = allData.find(item => item.id === canonicalId);
            if (chemical && chemical.data) {
              return chemical;
            }
          }
        }
      }
    }
    
    // Fallback: direct search
    for (const term of searchTerms) {
      const chemical = this.findChemicalByTerm(allData, term);
      if (chemical) {
        return chemical;
      }
    }
    
    // Last resort: fuzzy matching
    for (const item of allData) {
      if (item.type === 'chemical' && this.isChemicalMatch(item, searchTerms)) {
        return item;
      }
    }
    
    return null;
  }

  private generateSearchTerms(): string[] {
    const terms = new Set<string>();
    
    if (this.chemicalId) {
      terms.add(this.chemicalId);
      terms.add(`id#${this.chemicalId}`);
      terms.add(this.normalizeChemicalName(this.chemicalId));
      
      const parts = this.chemicalId.split(/[,\s]+/);
      parts.forEach(part => {
        if (part.trim()) {
          terms.add(part.trim());
          terms.add(this.normalizeChemicalName(part.trim()));
        }
      });
    }
    
    if (this.chemicalName) {
      terms.add(this.chemicalName);
      terms.add(this.normalizeChemicalName(this.chemicalName));
      
      const parts = this.chemicalName.split(/[,\s]+/);
      parts.forEach(part => {
        if (part.trim()) {
          terms.add(part.trim());
          terms.add(this.normalizeChemicalName(part.trim()));
        }
      });
    }
    
    return Array.from(terms).filter(term => term && term.trim());
  }

  private findChemicalByTerm(allData: AllDataItem[], term: string): AllDataItem | null {
    return allData.find(item => 
      item.type === 'chemical' && 
      (item.id === term || 
       item.id === `id#${term}` ||
       this.normalizeChemicalName(this.extractChemicalName(item)) === this.normalizeChemicalName(term))
    ) || null;
  }

  private isChemicalMatch(item: AllDataItem, searchTerms: string[]): boolean {
    const itemName = this.extractChemicalName(item);
    const itemId = item.id;
    
    return searchTerms.some(term => {
      const normalizedTerm = this.normalizeChemicalName(term);
      return (
        this.normalizeChemicalName(itemName).includes(normalizedTerm) ||
        this.normalizeChemicalName(itemId).includes(normalizedTerm) ||
        normalizedTerm.includes(this.normalizeChemicalName(itemName)) ||
        normalizedTerm.includes(this.normalizeChemicalName(itemId))
      );
    });
  }

  private normalizeChemicalName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractEmergencyProcedures(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    
    if (!this.emergencyType) {
      return this.extractAllEmergencyProcedures(data);
    }

    const relevantProperties = this.emergencyTypeMapping[this.emergencyType];
    
    if (!relevantProperties) {
      return [];
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

    for (const prop of relevantProperties) {
      if (data[prop] && emergencyMapping[prop]) {
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

    return stepGroups;
  }

  private extractAllEmergencyProcedures(data: any): StepGroup[] {
    const stepGroups: StepGroup[] = [];
    
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
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}