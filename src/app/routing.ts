import { Routes } from '@angular/router';

import { LoginComponent } from './auth/pages/login/login.component';
import { ForgotPasswordComponent } from './auth/pages/forgot-password/forgot-password.component';
import { authGuard } from './auth/guards/auth.guard';
import { guestGuard } from './auth/guards/guest.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    // Déjà connecté : directement au tableau de bord.
    canActivate: [guestGuard]
  },
  // Route publique.
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: '',
    // Toute l'application authentifiée ; sans session, retour à l'écran de connexion.
    canActivate: [authGuard],
    loadChildren: () => import('./layout/layout.routes').then((m) => m.LAYOUT_ROUTES)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
