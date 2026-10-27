import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { permissionGuard } from '../../auth/guards/permission.guard';
import { AuthService } from '../../auth/services/auth.service';
import { SalesHistoryPageComponent } from './pages/sales-history-page.component';
import { QuickSalePageComponent } from './pages/quick-sale-page.component';
import { SalesShellPageComponent } from './pages/sales-shell-page.component';
import { preferredSalesMode } from './data/quick-sale.model';

export const SALES_ROUTES: Routes = [
  {
    // Accès à l'onglet : sale:create ou sale:read (cf. ROUTE_PERMISSIONS). Sans sale:create, on
    // arrive directement sur l'historique ; sinon sur le dernier mode de caisse utilisé sur l'appareil.
    path: '',
    pathMatch: 'full',
    redirectTo: () =>
      inject(AuthService).hasPermission('sale:create') ? (preferredSalesMode() === 'quick' ? 'quick' : 'new') : 'history'
  },
  {
    // Caisse rapide (téléphone, comptoir) : même vente que la caisse complète, saisie simplifiée.
    path: 'quick',
    canMatch: [permissionGuard],
    data: { permissions: ['sale:create'] },
    component: QuickSalePageComponent
  },
  {
    // Caisse de vente : POST /api/sales.
    path: 'new',
    canMatch: [permissionGuard],
    data: { permissions: ['sale:create'] },
    component: SalesShellPageComponent
  },
  {
    // Historique : GET /api/sales.
    path: 'history',
    canMatch: [permissionGuard],
    data: { permissions: ['sale:read'] },
    component: SalesHistoryPageComponent
  }
];
