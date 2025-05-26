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
          import('../emergency-types/emergency-types.page').then((m) => m.EmergencyTypesPage),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../emergency-steps/emergency-steps.page').then((m) => m.EmergencyStepsPage),
      },
      {
        path: 'tab3',
        loadComponent: () =>
          import('../chemical-list/chemical-list.page').then((m) => m.ChemicalListPage),
      },
      {
        path: 'tab4',
        loadComponent: () =>
          import('../chemical-details/chemical-details.page').then((m) => m.ChemicalDetailsPage),
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