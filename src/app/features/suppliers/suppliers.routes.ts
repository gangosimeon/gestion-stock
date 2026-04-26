import { Routes } from '@angular/router';

import { SupplierDetailPageComponent } from './pages/supplier-detail-page.component';
import { SuppliersShellPageComponent } from './pages/suppliers-shell-page.component';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    component: SuppliersShellPageComponent
  },
  {
    path: ':id',
    component: SupplierDetailPageComponent
  }
];
