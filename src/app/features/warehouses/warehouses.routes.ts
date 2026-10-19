import { Routes } from '@angular/router';

import { WarehousesListPageComponent } from './pages/warehouses-list-page.component';

export const WAREHOUSES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: WarehousesListPageComponent
  },
  {
    // Ancienne adresse du transfert : il se fait désormais depuis l'écran Stock.
    path: 'transfer',
    redirectTo: '/stock/transfer'
  }
];
