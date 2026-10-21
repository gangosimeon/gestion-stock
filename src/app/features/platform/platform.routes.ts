import { Routes } from '@angular/router';

import { platformGuard, platformSessionGuard } from './data/platform.guards';
import { CompaniesPageComponent } from './pages/companies-page.component';
import { CompanyCreateComponent } from './pages/company-create.component';
import { CompanyDetailComponent } from './pages/company-detail.component';
import { PlatformAuditComponent } from './pages/platform-audit.component';
import { PlatformChangePasswordComponent } from './pages/platform-change-password.component';
import { PlatformDashboardComponent } from './pages/platform-dashboard.component';
import { PlatformLoginComponent } from './pages/platform-login.component';
import { PlatformShellComponent } from './platform-shell.component';

/** Espace Super Admin (/platform). Autorisation réelle : rôle SUPER_ADMIN vérifié par le backend. */
export const PLATFORM_ROUTES: Routes = [
  { path: 'login', component: PlatformLoginComponent },
  { path: 'change-password', component: PlatformChangePasswordComponent, canActivate: [platformSessionGuard] },
  {
    path: '',
    component: PlatformShellComponent,
    canActivate: [platformGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: PlatformDashboardComponent, title: 'Super Admin — Tableau de bord' },
      { path: 'companies', component: CompaniesPageComponent, title: 'Super Admin — Entreprises' },
      { path: 'companies/new', component: CompanyCreateComponent, title: 'Super Admin — Nouvelle entreprise' },
      { path: 'companies/:id', component: CompanyDetailComponent, title: 'Super Admin — Entreprise' },
      { path: 'audit', component: PlatformAuditComponent, title: 'Super Admin — Journal' }
    ]
  }
];
