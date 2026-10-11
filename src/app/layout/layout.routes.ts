import { Routes } from '@angular/router';
import { LayoutShellComponent } from './layout-shell.component';
import { permissionGuard } from '../auth/guards/permission.guard';

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
        path: 'categories',
        canMatch: [permissionGuard],
        data: { permissions: ['category:read'] },
        loadChildren: () => import('../features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES)
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
        canMatch: [permissionGuard],
        data: { permissions: ['appointment:read'] },
        loadChildren: () => import('../features/appointments/appointments.routes').then((m) => m.APPOINTMENTS_ROUTES)
      },
      {
        path: 'reports',
        canMatch: [permissionGuard],
        data: { permissions: ['report:read'] },
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
        canMatch: [permissionGuard],
        data: { permissions: ['expense:read'] },
        loadChildren: () => import('../features/expenses/expenses.routes').then((m) => m.EXPENSES_ROUTES)
      },
      {
        path: 'inventory',
        canMatch: [permissionGuard],
        data: { permissions: ['inventory:read'] },
        loadChildren: () => import('../features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES)
      },
      {
        path: 'warehouses',
        loadChildren: () => import('../features/warehouses/warehouses.routes').then((m) => m.WAREHOUSES_ROUTES)
      },
      {
        path: 'audit-logs',
        canMatch: [permissionGuard],
        data: { permissions: ['audit:read'] },
        loadChildren: () => import('../features/audit-logs/audit-logs.routes').then((m) => m.AUDIT_LOGS_ROUTES)
      },
      {
        path: 'users',
        canMatch: [permissionGuard],
        data: { permissions: ['user:manage'] },
        loadChildren: () => import('../features/users/users.routes').then((m) => m.USERS_ROUTES)
      }
    ]
  }
];
