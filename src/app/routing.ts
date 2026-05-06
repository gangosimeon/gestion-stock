import { Routes } from '@angular/router';

import { LoginComponent } from './auth/pages/login/login.component';
import { ForgotPasswordComponent } from './auth/pages/forgot-password/forgot-password.component';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
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
