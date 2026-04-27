import { Routes } from '@angular/router';

import { WarehousesListPageComponent } from './pages/warehouses-list-page.component';
import { WarehouseTransferPageComponent } from './pages/warehouse-transfer-page.component';

export const WAREHOUSES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: WarehousesListPageComponent
  },
  {
    path: 'transfer',
    component: WarehouseTransferPageComponent
  }
];
