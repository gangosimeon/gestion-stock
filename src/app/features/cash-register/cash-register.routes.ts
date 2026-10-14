import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { permissionGuard } from '../../auth/guards/permission.guard';
import { AuthService } from '../../auth/services/auth.service';
import { CashOpenPageComponent } from './pages/cash-open-page.component';
import { CashClosePageComponent } from './pages/cash-close-page.component';
import { CashHistoryPageComponent } from './pages/cash-history-page.component';

/** Ouvrir, mouvementer et fermer une caisse : GET/POST /api/cash-register/(current|open|close). */
const CASH_OPERATE = ['cash:operate'];

export const CASH_REGISTER_ROUTES: Routes = [
  {
    // Accès à l'onglet : cash:operate ou cash:read (cf. ROUTE_PERMISSIONS). Sans cash:operate,
    // on arrive directement sur l'historique, seul écran autorisé par cash:read.
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(AuthService).hasPermission('cash:operate') ? 'open' : 'history')
  },
  {
    path: 'open',
    canMatch: [permissionGuard],
    data: { permissions: CASH_OPERATE },
    component: CashOpenPageComponent
  },
  {
    path: 'close',
    canMatch: [permissionGuard],
    data: { permissions: CASH_OPERATE },
    component: CashClosePageComponent
  },
  {
    // GET /api/cash-register/sessions : cash:operate ou cash:read (garde de l'onglet).
    path: 'history',
    component: CashHistoryPageComponent
  }
];
