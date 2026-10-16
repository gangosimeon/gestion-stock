import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, catchError, combineLatest, finalize, forkJoin, map, of } from 'rxjs';

import {
  Dashboard,
  DashboardKpis,
  MyDay,
  SalesByDayPoint,
  StockEvolutionPoint,
  TopProductPoint
} from '../../../core/models/dashboard.model';
import { DashboardApiService } from '../../../core/services/dashboard-api.service';
import { AlertsApiService } from '../../../core/services/alerts-api.service';
import { CashRegisterApiService } from '../../../core/services/cash-register-api.service';
import { CashRegisterSession } from '../../../core/models/cash-register.model';
import { AuthService } from '../../../core/services/auth.service';
import { AuthService as SessionService } from '../../../auth/services/auth.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';

export type { DashboardKpis, SalesByDayPoint, StockEvolutionPoint, TopProductPoint };

export interface DashboardVm {
  isLoading: boolean;
  errorMessage: string | null;
  kpis: DashboardKpis;
  salesByDay: SalesByDayPoint[];
  topProducts: TopProductPoint[];
  stockEvolution: StockEvolutionPoint[];
  /** Permission report:read : tableau de bord du magasin. */
  canRead: boolean;
  /** Chiffres de tous les dépôts fusionnés (warehouse:all) au lieu du dépôt courant. */
  allWarehouses: boolean;
  /** Vue vendeur (sans report:read, avec sale:create) : mes ventes du jour, ma caisse, alertes stock. */
  seller: SellerDayVm | null;
}

export interface SellerDayVm {
  myDay: MyDay | null;
  /** Ma caisse ouverte (null : aucune) ; récapitulatif calculé par le backend. */
  cash: CashRegisterSession | null;
  /** Alertes de stock du dépôt courant (null : non disponible). */
  stockAlerts: number | null;
}

const EMPTY_KPIS: DashboardKpis = { todaySalesTotal: 0, todayProfit: 0, stockTotal: 0 };

/**
 * Tableau de bord : tous les chiffres viennent du serveur (GET /api/dashboard), calculés sur la
 * base. Aucune agrégation ni aucune série n'est fabriquée côté client.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardFacade {
  private readonly api = inject(DashboardApiService);
  private readonly alertsApi = inject(AlertsApiService);
  private readonly cashApi = inject(CashRegisterApiService);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly warehouseCtx = inject(WarehouseContextService);

  private loading?: Subscription;

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly dashboardSubject = new BehaviorSubject<Dashboard | null>(null);
  private readonly sellerSubject = new BehaviorSubject<SellerDayVm | null>(null);
  private readonly allWarehousesSubject = new BehaviorSubject<boolean>(false);

  readonly vm$ = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.dashboardSubject,
    this.sellerSubject,
    this.auth.hasPermission$('report:read'),
    this.allWarehousesSubject
  ]).pipe(
    map(
      ([isLoading, errorMessage, dashboard, seller, canRead, allWarehouses]): DashboardVm => ({
        canRead,
        allWarehouses,
        seller,
        isLoading,
        errorMessage,
        kpis: dashboard?.kpis ?? EMPTY_KPIS,
        salesByDay: dashboard?.salesByDay ?? [],
        topProducts: dashboard?.topProducts ?? [],
        stockEvolution: dashboard?.stockEvolution ?? []
      })
    )
  );

  constructor() {
    // Autre dépôt : les chiffres du précédent ne restent jamais affichés.
    this.warehouseCtx.warehouseChanged$.subscribe(() => {
      this.loading?.unsubscribe();
      this.isLoadingSubject.next(false);
      this.dashboardSubject.next(null);
      this.sellerSubject.next(null);
    });
  }

  refresh(): void {
    // Un chargement plus ancien (autre dépôt) est abandonné : sa réponse n'écrase pas la nouvelle.
    this.loading?.unsubscribe();
    if (!this.session.hasPermission('report:read')) {
      // Vendeur : sa journée seulement (le tableau de bord du magasin lui serait refusé).
      if (this.session.hasPermission('sale:create')) this.refreshSeller();
      return;
    }
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Vue fusionnée réservée à warehouse:all (le serveur refuserait de toute façon).
    const allWarehouses = this.allWarehousesSubject.value && this.session.hasPermission('warehouse:all');
    this.loading = this.api
      .get(allWarehouses)
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: (dashboard) => this.dashboardSubject.next(dashboard),
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  /** Tous les dépôts fusionnés, ou retour au dépôt courant : chiffres effacés puis rechargés. */
  setAllWarehouses(allWarehouses: boolean): void {
    if (this.allWarehousesSubject.value === allWarehouses) return;
    this.allWarehousesSubject.next(allWarehouses);
    this.dashboardSubject.next(null);
    this.refresh();
  }

  /** Tableau de bord du vendeur : chaque bloc vient du backend ; un bloc indisponible n'empêche pas les autres. */
  private refreshSeller(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);
    this.loading = forkJoin({
      myDay: this.api.myDay().pipe(
        catchError((e: unknown) => {
          this.errorSubject.next(e instanceof Error ? e.message : 'Erreur');
          return of(null);
        })
      ),
      cash: this.session.hasPermission('cash:operate') ? this.cashApi.current().pipe(catchError(() => of(null))) : of(null),
      stockAlerts: this.session.hasPermission('stock:read')
        ? this.alertsApi.summary().pipe(
            map((s) => s.stockAlertsCount),
            catchError(() => of(null))
          )
        : of(null)
    })
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe((seller) => this.sellerSubject.next(seller));
  }
}
