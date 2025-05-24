import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'emergency-steps',
    loadComponent: () => import('./tab2/emergency-steps.page').then(m => m.EmergencyStepsPage)
  }
];