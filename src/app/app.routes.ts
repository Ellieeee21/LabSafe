import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'emergency-types',
        loadComponent: () => import('./emergency-types/emergency-types.page').then((m) => m.EmergencyTypesPage),
      },
      {
        path: 'chemical-list',
        loadComponent: () => import('./chemical-list/chemical-list.page').then((m) => m.ChemicalListPage),
      },
      {
        path: 'emergency-steps',
        loadComponent: () => import('./emergency-steps/emergency-steps.page').then((m) => m.EmergencyStepsPage),
      },
      {
        path: 'chemical-details/:id',
        loadComponent: () => import('./chemical-details/chemical-details.page').then((m) => m.ChemicalDetailsPage),
      },
      {
        path: '',
        redirectTo: 'emergency-types',
        pathMatch: 'full'
      }
    ]
  }
];