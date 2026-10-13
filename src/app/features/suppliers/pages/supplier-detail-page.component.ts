import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, catchError, combineLatest, forkJoin, map, merge, of, shareReplay, skip, startWith, switchMap, take } from 'rxjs';

import { Supplier, SupplierAccount } from '../../../core/models/supplier.model';
import { SupplierPurchaseHistory } from '../../../core/models/supplier-purchase-history.model';
import { SupplierPayment, SupplierPaymentMethod } from '../../../core/models/supplier-payment.model';
import { AuthService } from '../../../core/services/auth.service';
import { CreateSupplierPaymentRequest, SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { PaySupplierDialogComponent, PaySupplierDialogResult } from '../ui/pay-supplier-dialog.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { ServerTable } from '../../../shared/table/server-table';

type DetailVm = {
  isLoading: boolean;
  errorMessage: string | null;
  supplier: Supplier | null;
  /** Totaux calculés par le backend ; `null` sans la permission purchase:read. */
  account: SupplierAccount | null;
  /** Permission purchase:read : achats, paiements et dette visibles. */
  canReadPurchases: boolean;
  /** Permission purchase:pay (interface seulement ; le backend la revérifie). */
  canPay: boolean;
};

const EMPTY: Omit<DetailVm, 'isLoading' | 'errorMessage'> = {
  supplier: null,
  account: null,
  canReadPurchases: false,
  canPay: false
};

const METHOD_LABELS: Record<SupplierPaymentMethod, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile money',
  BANK_TRANSFER: 'Virement'
};

@Component({
  selector: 'app-supplier-detail-page',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatSortModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatProgressBarModule,
    MatTableModule
  ],
  templateUrl: './supplier-detail-page.component.html',
  styleUrl: './supplier-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SuppliersApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  /** Rechargement des historiques : après un paiement, ou en passant à un autre fournisseur. */
  private readonly reloadTables$ = merge(this.refresh$.pipe(skip(1)), this.route.paramMap.pipe(skip(1)));

  private get supplierId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  /** Droits lus au moment de la requête : sans purchase:read, le backend refuserait les historiques. */
  private readonly rights$ = combineLatest([this.auth.hasPermission$('purchase:read'), this.auth.hasPermission$('warehouse:all')]).pipe(take(1));

  /** Réceptions du fournisseur : recherche, tri et pagination traités par le backend. */
  readonly historyTable = new ServerTable<SupplierPurchaseHistory>(
    (query) =>
      this.rights$.pipe(
        switchMap(([canRead, allWarehouses]) =>
          canRead
            ? this.api.purchaseHistoryPage(this.supplierId, query, allWarehouses)
            : of({ items: [] as SupplierPurchaseHistory[], total: 0 })
        )
      ),
    { sortFields: { date: 'purchaseDateIso', total: 'totalAmount' }, reload$: this.reloadTables$ }
  );

  /** Paiements du fournisseur : recherche, tri et pagination traités par le backend. */
  readonly paymentsTable = new ServerTable<SupplierPayment>(
    (query) =>
      this.rights$.pipe(
        switchMap(([canRead]) =>
          canRead ? this.api.paymentsPage(this.supplierId, query) : of({ items: [] as SupplierPayment[], total: 0 })
        )
      ),
    { sortFields: { date: 'paymentDate', number: 'number', amount: 'amount' }, reload$: this.reloadTables$ }
  );

  readonly displayedColumns = ['date', 'reference', 'order', 'items', 'total'] as const;
  readonly paymentColumns = ['date', 'number', 'amount', 'method', 'order', 'note'] as const;

  readonly vm$: Observable<DetailVm> = combineLatest([
    this.refresh$,
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    this.auth.hasPermission$('purchase:read'),
    this.auth.hasPermission$('purchase:pay')
  ]).pipe(
    switchMap(([, id, canReadPurchases, canPay]) => {
      if (!id) {
        return of<DetailVm>({ ...EMPTY, isLoading: false, errorMessage: 'ID fournisseur manquant' });
      }
      const supplier$ = this.api.getById(id);
      // Sans purchase:read, le backend refuse le compte : on ne le demande pas (historiques paginés à part).
      const account$ = canReadPurchases ? this.api.account(id) : of(null);
      return forkJoin({ supplier: supplier$, account: account$ }).pipe(
        map(
          (r): DetailVm => ({
            isLoading: false,
            errorMessage: null,
            supplier: r.supplier,
            account: r.account,
            canReadPurchases,
            canPay: canPay && canReadPurchases
          })
        ),
        startWith<DetailVm>({ ...EMPTY, isLoading: true, errorMessage: null }),
        catchError((e: unknown) =>
          of<DetailVm>({ ...EMPTY, isLoading: false, errorMessage: e instanceof Error ? e.message : 'Erreur' })
        )
      );
    }),
    // Une seule série d'appels pour tous les abonnés de l'écran.
    shareReplay({ bufferSize: 1, refCount: true })
  );

  methodLabel(method: SupplierPaymentMethod | undefined): string {
    return method ? METHOD_LABELS[method] : '—';
  }

  /** Commandes réglées par un paiement (réparti par le backend). */
  ordersOf(payment: SupplierPayment): string {
    return payment.allocations?.length ? payment.allocations.map((a) => a.orderNumber).join(', ') : '—';
  }

  paySupplier(vm: DetailVm): void {
    const supplierId = vm.supplier?.id;
    if (!supplierId || !vm.canPay) return;

    this.dialog
      .open(PaySupplierDialogComponent, {
        data: {
          title: `Payer ${vm.supplier?.name ?? ''}`,
          maxAmount: vm.account?.remainingToPay
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((res: PaySupplierDialogResult | undefined) => {
        if (!res) return;

        const payload: CreateSupplierPaymentRequest = {
          amount: res.amount,
          paymentDateIso: res.paymentDateIso,
          paymentMethod: res.paymentMethod,
          externalReference: res.externalReference,
          note: res.note
        };

        this.api
          .createPayment(supplierId, payload)
          .pipe(take(1))
          .subscribe({
            next: (payment) => {
              this.snackbar.open(`Paiement ${payment.number ?? ''} enregistré`, 'OK', { duration: 2500 });
              this.refresh$.next(undefined);
            },
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
