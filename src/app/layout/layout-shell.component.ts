import { AsyncPipe, CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';

import { AuthService as CoreAuthService } from '../core/services/auth.service';
import { AuthService } from '../auth/services/auth.service';
import { WarehouseContextService } from '../core/services/warehouse-context.service';
import { CompanyBranding } from '../core/branding/branding.model';
import { BrandingService } from '../core/branding/branding.service';
import { WarehousesApiService } from '../core/services/warehouses-api.service';
import { Warehouse } from '../core/models/warehouse.model';
import { SelectSearchComponent } from '../shared/select/select-search.component';
import { CashRegisterFacade } from '../features/cash-register/data/cash-register.facade';
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
  private readonly cashRegister = inject(CashRegisterFacade);
  private readonly brandingService = inject(BrandingService);

  /** Marque de l'entreprise connectée (logo et nom dans la barre latérale). */
  readonly branding$ = this.brandingService.branding$;

  @ViewChild('sidenav') sidenav!: MatSidenav;

  collapsed = false;
  userMenuOpen = false;

  /** Petit écran (< 960 px) : la barre latérale devient un menu superposé, fermé par défaut. */
  isMobile = false;
  /** Menu superposé ouvert (petit écran uniquement). */
  mobileMenuOpen = false;

  readonly currentUser$ = this.auth.currentUser$;

  /**
   * Dépôts actifs réellement visibles par l'utilisateur (backend). Un choix enregistré qui n'en
   * fait plus partie est oublié au profit du dépôt appliqué par le backend (/warehouses/current).
   * Relu quand le backend refuse le dépôt envoyé (choix périmé : dépôt désactivé ou retiré).
   */
  readonly warehouses$ = this.warehouseCtx.revalidationRequested$.pipe(
    startWith(undefined),
    switchMap(() => this.warehousesApi.list().pipe(
      map((r) => r.items.filter((w) => w.active !== false)),
      switchMap((items) => {
        if (this.warehouseCtx.keepIfVisible(items)) {
          this.noWarehouseSubject.next(false);
          return of(items);
        }
        return this.warehousesApi.current().pipe(
          tap((w) => {
            this.noWarehouseSubject.next(false);
            this.warehouseCtx.select(w);
          }),
          map(() => items),
          // Liste reçue mais vide et aucun dépôt par défaut (NO_WAREHOUSE_AVAILABLE) : rien à afficher.
          catchError(() => {
            if (items.length === 0) this.noWarehouseSubject.next(true);
            return of(items);
          })
        );
      }),
      catchError(() => of([] as Warehouse[]))
    )),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly warehouseId$ = this.warehouseCtx.warehouseId$;

  private readonly noWarehouseSubject = new BehaviorSubject<boolean>(false);
  /** Aucun dépôt actif affecté : les écrans métier sont remplacés par une explication. */
  readonly noWarehouse$ = this.noWarehouseSubject.asObservable();

  /**
   * Caisse ouverte dans un autre dépôt que le dépôt courant : elle n'y est pas utilisable
   * (encaissements refusés par le backend). `null` sinon, ou sans la permission cash:operate.
   */
  readonly cashElsewhere$: Observable<{ warehouseId: string; name: string } | null> = this.coreAuth
    .hasPermission$('cash:operate')
    .pipe(
      switchMap((canOperate) =>
        canOperate
          ? combineLatest([this.cashRegister.current$, this.warehouseId$, this.warehouses$])
          : of([null, '', []] as const)
      ),
      map(([session, wid, warehouses]) => {
        const at = session?.status === 'OPEN' ? session.warehouseId : undefined;
        if (!at) return null;
        // Le backend situe la caisse par rapport au dépôt courant ; à défaut, comparaison locale.
        const elsewhere = session?.inCurrentWarehouse != null ? !session.inCurrentWarehouse : !!wid && at !== wid;
        if (!elsewhere) return null;
        return { warehouseId: at, name: warehouses.find((w) => w.id === at)?.name ?? 'un autre magasin' };
      })
    );

  readonly navItems: NavItem[] = (
    [
      { label: 'Dashboard', icon: 'dashboard', section: 'dashboard' },
      { label: 'Catégories', icon: 'category', section: 'categories' },
      { label: 'Produits', icon: 'inventory_2', section: 'products' },
      { label: 'Stock', icon: 'warehouse', section: 'stock' },
      { label: 'Ventes', icon: 'point_of_sale', section: 'sales' },
      { label: 'Devis', icon: 'request_quote', section: 'quotes' },
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
      { label: 'Utilisateurs', icon: 'admin_panel_settings', section: 'users' },
      { label: 'Mon entreprise', icon: 'business', section: 'company' },
      { label: 'Paramètres', icon: 'settings', section: 'settings' },
      { label: 'Boutique en ligne', icon: 'storefront', section: 'settings/online-shop' }
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
    // Thème à jour (le cache appliqué au démarrage peut dater d'une modification par GestStock).
    this.brandingService.load().subscribe();

    inject(BreakpointObserver)
      .observe('(max-width: 959.98px)')
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((state) => {
        this.isMobile = state.matches;
        // Changement de taille d'écran : menu superposé refermé.
        this.mobileMenuOpen = false;
      });
  }

  logoSrc(branding: CompanyBranding): string | null {
    return this.brandingService.logoSrc(branding);
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

  isVisible(warehouseId: string, warehouses: readonly Warehouse[]): boolean {
    return warehouses.some((w) => w.id === warehouseId);
  }

  /**
   * Choix d'un magasin dans l'en-tête. Un contrôle peut le refuser (panier en cours non abandonné) :
   * le sélecteur revient alors sur le magasin courant, rien n'a changé.
   */
  async setWarehouse(id: string, warehouses: readonly Warehouse[], select?: MatSelect): Promise<void> {
    const warehouse = warehouses.find((w) => w.id === id);
    const changed = warehouse ? await this.warehouseCtx.requestSelect(warehouse) : false;
    if (!changed && select) select.value = this.warehouseCtx.warehouseId;
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
