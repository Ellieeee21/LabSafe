import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () =>
          import('../tab1/emergency-types.page').then((m) => m.EmergencyTypesPage),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../tab2/emergency-steps.page').then((m) => m.EmergencyStepsPage),
      },
      
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  
  {
    path: 'emergency-steps',
    loadComponent: () =>
      import('../tab2/emergency-steps.page').then((m) => m.EmergencyStepsPage),
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full',
  },
];