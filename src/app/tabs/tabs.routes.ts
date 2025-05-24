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
        path: 'tab3',
        loadComponent: () =>
          import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  // Add the emergency-steps as a separate route (not within tabs)
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