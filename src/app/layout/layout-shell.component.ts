import { AsyncPipe, CommonModule } from '@angular/common';
import { catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';
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
import { Warehouse } from '../core/models/warehouse.model';
import { SelectSearchComponent } from '../shared/select/select-search.component';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Permission backend requise pour afficher l'entrée (même règle que la route). */
  permission?: string;
}

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [
    SelectSearchComponent,
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

  /**
   * Dépôts réellement visibles par l'utilisateur (backend). Un choix enregistré qui n'en fait
   * plus partie est oublié au profit du dépôt appliqué par le backend (/warehouses/current).
   */
  readonly warehouses$ = this.warehousesApi.list().pipe(
    map((r) => r.items),
    switchMap((items) => {
      if (this.warehouseCtx.keepIfVisible(items)) return of(items);
      return this.warehousesApi.current().pipe(
        tap((w) => this.warehouseCtx.select(w)),
        map(() => items),
        catchError(() => of(items))
      );
    }),
    catchError(() => of([] as Warehouse[])),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly warehouseId$ = this.warehouseCtx.warehouseId$;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Produits', icon: 'inventory_2', route: '/products' },
    { label: 'Catégories', icon: 'category', route: '/categories', permission: 'category:read' },
    { label: 'Stock', icon: 'warehouse', route: '/stock' },
    { label: 'Ventes', icon: 'point_of_sale', route: '/sales' },
    { label: 'Clients', icon: 'people', route: '/clients' },
    { label: 'Achats', icon: 'shopping_cart', route: '/purchases' },
    { label: 'Fournisseurs', icon: 'local_shipping', route: '/suppliers' },
    { label: 'Caisse', icon: 'payments', route: '/cash-register' },
    { label: 'Dépenses', icon: 'receipt_long', route: '/expenses', permission: 'expense:read' },
    { label: 'Inventaire', icon: 'fact_check', route: '/inventory', permission: 'inventory:read' },
    { label: 'Dépôts', icon: 'store', route: '/warehouses' },
    { label: 'Rapports', icon: 'bar_chart', route: '/reports', permission: 'report:read' },
    { label: 'RDV', icon: 'event', route: '/appointments', permission: 'appointment:read' },
    { label: 'Audit', icon: 'history', route: '/audit-logs', permission: 'audit:read' },
    { label: 'Utilisateurs', icon: 'admin_panel_settings', route: '/users', permission: 'user:manage' }
  ];

  readonly visibleNavItems$ = this.currentUser$.pipe(
    map((user) =>
      this.navItems.filter((item) => !item.permission || (user?.permissions?.includes(item.permission) ?? false))
    )
  );

  constructor() {
    // Session ouverte avant cette version (sans permissions en cache) : un seul GET /auth/me.
    this.auth.ensureCurrentUser().subscribe();
  }

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

  setWarehouse(id: string, warehouses: readonly Warehouse[]): void {
    const warehouse = warehouses.find((w) => w.id === id);
    if (warehouse) this.warehouseCtx.select(warehouse);
  }

  toggleSidenav(): void {
    this.collapsed = !this.collapsed;
  }
}
