import { Routes } from '@angular/router';

import { InventoryCountPageComponent } from './pages/inventory-count-page.component';
import { InventoryHistoryPageComponent } from './pages/inventory-history-page.component'; 

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'count'
  },
  {
    path: 'count',
    component: InventoryCountPageComponent
  },
  {
    path: 'history',
    component: InventoryHistoryPageComponent
  }
];
