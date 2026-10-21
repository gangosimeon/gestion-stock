import { Routes } from '@angular/router';

import { LoginComponent } from './auth/pages/login/login.component';
import { ForgotPasswordComponent } from './auth/pages/forgot-password/forgot-password.component';
import { ActivateComponent } from './auth/pages/activate/activate.component';
import { CompanySuspendedComponent } from './auth/pages/company-suspended/company-suspended.component';
import { authGuard } from './auth/guards/auth.guard';
import { guestGuard } from './auth/guards/guest.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    // Déjà connecté : directement au tableau de bord.
    canActivate: [guestGuard]
  },
  // Routes publiques.
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  // Lien d'accès (activation du compte initial, réinitialisation) : ?company=…&token=…
  {
    path: 'activate',
    component: ActivateComponent
  },
  // Entreprise suspendue : écran explicatif.
  {
    path: 'company-suspended',
    component: CompanySuspendedComponent
  },
  // Espace Super Admin GestStock (session et routes distinctes de celles des entreprises).
  {
    path: 'platform',
    loadChildren: () => import('./features/platform/platform.routes').then((m) => m.PLATFORM_ROUTES)
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
