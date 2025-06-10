import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DatabaseService, AllDataItem } from '../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChemicalAliasesService } from '../services/chemical-aliases.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSearchbar, 
  IonSpinner, 
  IonButton 
} from '@ionic/angular/standalone';

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
  isIOS: boolean = false;
  isAndroid: boolean = false;
  keyboardHeight: number = 0;
  
  private backButtonSubscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();
  private keyboardSubscription: Subscription = new Subscription();

  private emergencyTypeMapping: { [key: string]: string[] } = {
    'Eye Contact': ['id#hasFirstAidEye', 'hasFirstAidEye'],
    'Fire': ['id#hasSmallFireFighting', 'hasSmallFireFighting', 'id#hasLargeFireFighting', 'hasLargeFireFighting'],
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
    private databaseService: DatabaseService,
    private chemicalAliasesService: ChemicalAliasesService
  ) {
    this.isIOS = this.platform.is('ios');
    this.isAndroid = this.platform.is('android');
  }

  async ngOnInit() {
    await this.initializePlatformFeatures();
    
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
    this.setupBackButtonHandling();
    if (this.isIOS) {
      this.setupIOSKeyboardHandling();
    }

    // Subscribe to database loading state
    this.dataSubscription = this.databaseService.allData$.subscribe(async (data) => {
  if (data && data.length > 0) {
    console.log('Database data received, reloading steps');
    await this.loadEmergencySteps(); // Add await here
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
    if (this.keyboardSubscription) {
      this.keyboardSubscription.unsubscribe();
    }
  }

  // Platform-specific initialization
  private async initializePlatformFeatures() {
    if (this.isIOS) {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#C00000' });
        
        // Enable iOS haptic feedback
        console.log('iOS features initialized');
      } catch (error) {
        console.warn('iOS features not available:', error);
      }
    }
  }

  // Setup platform-specific back button handling
  private setupBackButtonHandling() {
    if (this.isAndroid) {
      // Android hardware back button
      this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
        this.goBack();
      });
    } else if (this.isIOS) {
      console.log('iOS swipe back gesture enabled');
    }
  }

 // iOS keyboard handling
  private async setupIOSKeyboardHandling() {
    if (this.platform.is('capacitor')) {
      try {
       const keyboardShowListener = await Keyboard.addListener('keyboardWillShow', info => {
         this.keyboardHeight = info.keyboardHeight;
         this.adjustViewForKeyboard(true);
        });

       const keyboardHideListener = await Keyboard.addListener('keyboardWillHide', () => {
         this.keyboardHeight = 0;
         this.adjustViewForKeyboard(false);
       });
       this.keyboardSubscription.add(() => {
         keyboardShowListener.remove();
         keyboardHideListener.remove();
       });
     } catch (error) {
        console.warn('Keyboard plugin not available:', error);
    }
  }
}

  // Adjust view for iOS keyboard
  private adjustViewForKeyboard(isVisible: boolean) {
    if (this.isIOS && isVisible) {
      const content = document.querySelector('ion-content');
      if (content) {
        content.style.setProperty('--padding-bottom', `${this.keyboardHeight + 20}px`);
      }
    } else {
      const content = document.querySelector('ion-content');
      if (content) {
        content.style.setProperty('--padding-bottom', '80px');
      }
    }
  }

  // Enhanced haptic feedback for iOS
  private async triggerHapticFeedback(style: ImpactStyle = ImpactStyle.Light) {
    if (this.isIOS && this.platform.is('capacitor')) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    }
  }

  private async loadEmergencySteps() {
  this.isLoading = true;
  
  try {
    const allData = this.databaseService.getCurrentAllData();
    console.log('All data length:', allData.length);
    
    if (allData && allData.length > 0) {
      const chemical = await this.findChemicalData(allData); // Now awaiting the async method
      console.log('Found chemical:', chemical);
      
      if (chemical && chemical.data) {
        console.log('Chemical data keys:', Object.keys(chemical.data));
        this.allStepGroups = this.extractEmergencyProcedures(chemical.data);
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

  private async findChemicalData(allData: AllDataItem[]): Promise<AllDataItem | null> {
  const normalizedSearchName = this.normalizeChemicalName(this.chemicalName);
  const mainChemicalName = await this.getMainChemicalName(this.chemicalName); // Now awaiting the promise
  const normalizedMainName = this.normalizeChemicalName(mainChemicalName);

  return allData.find((item: AllDataItem) => {
    if (item.type !== 'chemical') return false;
    
    const itemName = this.normalizeChemicalName(item.name || '');
    const itemId = this.normalizeChemicalName(item.id?.replace('id#', '') || '');
    
    return itemId === this.chemicalId || 
           itemId === `id#${this.chemicalId}` ||
           itemName === normalizedSearchName ||
           itemId === normalizedSearchName ||
           itemName === normalizedMainName ||
           itemId === normalizedMainName;
  }) || null;
}

  private normalizeChemicalName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private async getMainChemicalName(name: string): Promise<string> {
  return await this.chemicalAliasesService.getMainChemicalName(name);
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

  async onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.searchQuery = query;
    this.applySearch();
    
    // iOS haptic feedback on search
    if (this.isIOS && query.length > 0) {
      await this.triggerHapticFeedback(ImpactStyle.Light);
    }
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

  async goBack() {
    // Haptic feedback for navigation
    await this.triggerHapticFeedback(ImpactStyle.Light);
    
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

  async navigateToHome() {
    await this.triggerHapticFeedback(ImpactStyle.Light);
    this.router.navigate(['/emergency-types']);
  }

  async navigateToChemicals() {
    await this.triggerHapticFeedback(ImpactStyle.Light);
    this.router.navigate(['/chemical-list']);
  }

  async navigateToHistory() {
    await this.triggerHapticFeedback(ImpactStyle.Light);
    console.log('History feature coming soon');
  }

  async navigateToProfile() {
    await this.triggerHapticFeedback(ImpactStyle.Light);
    this.router.navigate(['/profile']);
  }
}