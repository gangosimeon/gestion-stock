import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: '',
    loadChildren: () => import('./layout/layout.routes').then((m) => m.LAYOUT_ROUTES)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
