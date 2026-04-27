import { Routes } from '@angular/router';
import { LayoutShellComponent } from './layout-shell.component';

export const LAYOUT_ROUTES: Routes = [
  {
    path: '',
    component: LayoutShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadChildren: () => import('../features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
      },
      {
        path: 'products',
        loadChildren: () => import('../features/products/products.routes').then((m) => m.PRODUCTS_ROUTES)
      },
      {
        path: 'stock',
        loadChildren: () => import('../features/stock/stock.routes').then((m) => m.STOCK_ROUTES)
      },
      {
        path: 'sales',
        loadChildren: () => import('../features/sales/sales.routes').then((m) => m.SALES_ROUTES)
      },
      {
        path: 'clients',
        loadChildren: () => import('../features/clients/clients.routes').then((m) => m.CLIENTS_ROUTES)
      },
      {
        path: 'appointments',
        loadChildren: () => import('../features/appointments/appointments.routes').then((m) => m.APPOINTMENTS_ROUTES)
      },
      {
        path: 'reports',
        loadChildren: () => import('../features/reports/reports.routes').then((m) => m.REPORTS_ROUTES)
      },
      {
        path: 'purchases',
        loadChildren: () => import('../features/purchases/purchases.routes').then((m) => m.PURCHASES_ROUTES)
      },
      {
        path: 'suppliers',
        loadChildren: () => import('../features/suppliers/suppliers.routes').then((m) => m.SUPPLIERS_ROUTES)
      },
      {
        path: 'cash-register',
        loadChildren: () => import('../features/cash-register/cash-register.routes').then((m) => m.CASH_REGISTER_ROUTES)
      },
      {
        path: 'expenses',
        loadChildren: () => import('../features/expenses/expenses.routes').then((m) => m.EXPENSES_ROUTES)
      },
      {
        path: 'inventory',
        loadChildren: () => import('../features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES)
      },
      {
        path: 'warehouses',
        loadChildren: () => import('../features/warehouses/warehouses.routes').then((m) => m.WAREHOUSES_ROUTES)
      },
      {
        path: 'audit-logs',
        loadChildren: () => import('../features/audit-logs/audit-logs.routes').then((m) => m.AUDIT_LOGS_ROUTES)
      },
      {
        path: 'users',
        loadChildren: () => import('../features/users/users.routes').then((m) => m.USERS_ROUTES)
      }
    ]
  }
];
