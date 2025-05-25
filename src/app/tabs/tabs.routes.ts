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
          import('../tab3/chemical-list.page').then((m) => m.ChemicalListPage),
      },
      {
        path: 'tab4',
        loadComponent: () =>
          import('../tab4/chemical-details.page').then((m) => m.ChemicalDetailsPage),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full',
  },
];