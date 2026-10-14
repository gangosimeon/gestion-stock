import { AsyncPipe, CommonModule } from '@angular/common';
import { catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { AppSection, ROUTE_PERMISSIONS } from './route-permissions';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Permissions backend (au moins une) : les mêmes que la route, cf. ROUTE_PERMISSIONS. */
  permissions: readonly string[];
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

  /** Petit écran (< 960 px) : la barre latérale devient un menu superposé, fermé par défaut. */
  isMobile = false;
  /** Menu superposé ouvert (petit écran uniquement). */
  mobileMenuOpen = false;

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

  readonly navItems: NavItem[] = (
    [
      { label: 'Dashboard', icon: 'dashboard', section: 'dashboard' },
      { label: 'Produits', icon: 'inventory_2', section: 'products' },
      { label: 'Catégories', icon: 'category', section: 'categories' },
      { label: 'Stock', icon: 'warehouse', section: 'stock' },
      { label: 'Ventes', icon: 'point_of_sale', section: 'sales' },
      { label: 'Clients', icon: 'people', section: 'clients' },
      { label: 'Achats', icon: 'shopping_cart', section: 'purchases' },
      { label: 'Fournisseurs', icon: 'local_shipping', section: 'suppliers' },
      { label: 'Caisse', icon: 'payments', section: 'cash-register' },
      { label: 'Dépenses', icon: 'receipt_long', section: 'expenses' },
      { label: 'Inventaire', icon: 'fact_check', section: 'inventory' },
      { label: 'Dépôts', icon: 'store', section: 'warehouses' },
      { label: 'Rapports', icon: 'bar_chart', section: 'reports' },
      { label: 'RDV', icon: 'event', section: 'appointments' },
      { label: 'Audit', icon: 'history', section: 'audit-logs' },
      { label: 'Utilisateurs', icon: 'admin_panel_settings', section: 'users' }
    ] satisfies { label: string; icon: string; section: AppSection }[]
  ).map(({ label, icon, section }) => ({
    label,
    icon,
    route: `/${section}`,
    permissions: ROUTE_PERMISSIONS[section]
  }));

  readonly visibleNavItems$ = this.currentUser$.pipe(
    map((user) =>
      this.navItems.filter(
        (item) =>
          item.permissions.length === 0 || item.permissions.some((p) => user?.permissions?.includes(p) ?? false)
      )
    )
  );

  constructor() {
    // Session ouverte avant cette version (sans permissions en cache) : un seul GET /auth/me.
    this.auth.ensureCurrentUser().subscribe();

    inject(BreakpointObserver)
      .observe('(max-width: 959.98px)')
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((state) => {
        this.isMobile = state.matches;
        // Changement de taille d'écran : menu superposé refermé.
        this.mobileMenuOpen = false;
      });
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

  /** Grand écran : replie / déplie la barre latérale ; petit écran : ouvre / ferme le menu superposé. */
  toggleSidenav(): void {
    if (this.isMobile) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    } else {
      this.collapsed = !this.collapsed;
    }
  }

  /** Après un choix dans le menu superposé, il se referme (petit écran). */
  onNavigate(): void {
    if (this.isMobile) this.mobileMenuOpen = false;
  }

  /** Initiales affichées dans l'avatar (premières lettres du nom d'utilisateur). */
  initials(username: string | null | undefined): string {
    const parts = (username ?? '').split(/[.\s_-]+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
    return letters.toUpperCase();
  }
}
