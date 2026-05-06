import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';

import { AuthService as CoreAuthService } from '../core/services/auth.service';
import { AuthService } from '../auth/services/auth.service';
import { WarehouseContextService } from '../core/services/warehouse-context.service';
import { WarehousesApiService } from '../core/services/warehouses-api.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    MatListModule
  ],
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LayoutShellComponent {
  private readonly coreAuth = inject(CoreAuthService);
  private readonly auth = inject(AuthService);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly warehouseCtx = inject(WarehouseContextService);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  collapsed = false;
  userMenuOpen = false;

  readonly currentUser$ = this.auth.currentUser$;

  readonly warehouses$ = this.warehousesApi.list();
  readonly warehouseId$ = this.warehouseCtx.warehouseId$;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Produits', icon: 'inventory_2', route: '/products' },
    { label: 'Stock', icon: 'warehouse', route: '/stock' },
    { label: 'Ventes', icon: 'point_of_sale', route: '/sales' },
    { label: 'Clients', icon: 'people', route: '/clients' },
    { label: 'Achats', icon: 'shopping_cart', route: '/purchases' },
    { label: 'Fournisseurs', icon: 'local_shipping', route: '/suppliers' },
    { label: 'Caisse', icon: 'payments', route: '/cash-register' },
    { label: 'Dépenses', icon: 'receipt_long', route: '/expenses' },
    { label: 'Inventaire', icon: 'fact_check', route: '/inventory' },
    { label: 'Dépôts', icon: 'store', route: '/warehouses' },
    { label: 'Rapports', icon: 'bar_chart', route: '/reports' },
    { label: 'RDV', icon: 'event', route: '/appointments' },
    { label: 'Audit', icon: 'history', route: '/audit-logs' },
    { label: 'Utilisateurs', icon: 'admin_panel_settings', route: '/users' }
  ];

  logout(): void {
    this.auth.logout();
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'MANAGER': return 'Manager';
      default: return 'Employé';
    }
  }

  setWarehouse(id: string): void {
    this.warehouseCtx.setWarehouseId(id);
  }

  toggleSidenav(): void {
    this.collapsed = !this.collapsed;
  }
}
