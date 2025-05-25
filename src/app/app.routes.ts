import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'emergency-steps',
    loadComponent: () => import('./tab2/emergency-steps.page').then(m => m.EmergencyStepsPage)
  },
  // Standalone routes for direct navigation
  {
    path: 'chemical-list',
    loadComponent: () => import('./tab3/chemical-list.page').then(m => m.ChemicalListPage)
  },
  {
    path: 'chemical-details/:id',
    loadComponent: () => import('./tab4/chemical-details.page').then(m => m.ChemicalDetailsPage)
  }
];