import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'splash',
    loadComponent: () => import('./splash/splash.page').then(m => m.SplashPage)
  },
  {
    path: 'emergency-types',
    loadComponent: () => import('./emergency-types/emergency-types.page').then((m) => m.EmergencyTypesPage),
  },
  {
    path: 'emergency-steps',
    loadComponent: () => import('./emergency-steps/emergency-steps.page').then((m) => m.EmergencyStepsPage),
  },
  {
    path: 'chemical-list',
    loadComponent: () => import('./chemical-list/chemical-list.page').then((m) => m.ChemicalListPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  }
];