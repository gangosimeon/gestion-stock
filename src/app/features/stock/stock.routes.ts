import { Routes } from '@angular/router';

import { permissionGuard } from '../../auth/guards/permission.guard';
import { StockShellPageComponent } from './pages/stock-shell-page.component';
import { StockTransferPageComponent } from './pages/stock-transfer-page.component';
import { StockTransfersPageComponent } from './pages/stock-transfers-page.component';

export const STOCK_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: StockShellPageComponent
  },
  {
    // Nouveau transfert : POST /api/warehouses/transfer.
    path: 'transfer',
    canMatch: [permissionGuard],
    data: { permissions: ['stock:transfer'] },
    component: StockTransferPageComponent
  },
  {
    // Historique des transferts envoyés et reçus : GET /api/stock/transfers (stock:read, exigé par l'onglet).
    path: 'transfers',
    component: StockTransfersPageComponent
  }
];
