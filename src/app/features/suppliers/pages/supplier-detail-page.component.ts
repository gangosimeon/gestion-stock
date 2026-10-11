import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, catchError, combineLatest, forkJoin, map, of, shareReplay, startWith, switchMap, take } from 'rxjs';

import { Supplier, SupplierAccount } from '../../../core/models/supplier.model';
import { SupplierPurchaseHistory } from '../../../core/models/supplier-purchase-history.model';
import { SupplierPayment, SupplierPaymentMethod } from '../../../core/models/supplier-payment.model';
import { AuthService } from '../../../core/services/auth.service';
import { CreateSupplierPaymentRequest, SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { PaySupplierDialogComponent, PaySupplierDialogResult } from '../ui/pay-supplier-dialog.component';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { ListTable } from '../../../shared/table/list-table';
import { TableSearchComponent } from '../../../shared/table/table-search.component';

type DetailVm = {
  isLoading: boolean;
  errorMessage: string | null;
  supplier: Supplier | null;
  history: SupplierPurchaseHistory[];
  payments: SupplierPayment[];
  /** Totaux calculés par le backend ; `null` sans la permission purchase:read. */
  account: SupplierAccount | null;
  /** Permission purchase:read : achats, paiements et dette visibles. */
  canReadPurchases: boolean;
  /** Permission purchase:pay (interface seulement ; le backend la revérifie). */
  canPay: boolean;
};

const EMPTY: Omit<DetailVm, 'isLoading' | 'errorMessage'> = {
  supplier: null,
  history: [],
  payments: [],
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
    TableSearchComponent,
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
  readonly historyTable = new ListTable<SupplierPurchaseHistory>(
    (h) => `${h.reference ?? ''} ${h.purchaseOrderNumber ?? ''}`,
    (h, col) => (col === 'date' ? h.purchaseDateIso : col === 'order' ? h.purchaseOrderNumber : col === 'items' ? h.itemsCount : col === 'total' ? h.totalAmount : undefined)
  );

  readonly paymentsTable = new ListTable<SupplierPayment>(
    (p) => `${p.number ?? ''} ${p.externalReference ?? ''} ${this.methodLabel(p.paymentMethod)} ${this.ordersOf(p)} ${p.note ?? ''}`,
    (p, col) => (col === 'date' ? p.paymentDateIso : col === 'method' ? this.methodLabel(p.paymentMethod) : col === 'order' ? this.ordersOf(p) : undefined)
  );
  @ViewChild('historyTablePaginator') set historyTablePaginator(p: MatPaginator | undefined) {
    this.historyTable.attachPaginator(p);
  }
  @ViewChild('historyTableSort') set historyTableSort(s: MatSort | undefined) {
    this.historyTable.attachSort(s);
  }
  @ViewChild('paymentsTablePaginator') set paymentsTablePaginator(p: MatPaginator | undefined) {
    this.paymentsTable.attachPaginator(p);
  }
  @ViewChild('paymentsTableSort') set paymentsTableSort(s: MatSort | undefined) {
    this.paymentsTable.attachSort(s);
  }

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SuppliersApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly displayedColumns = ['date', 'reference', 'order', 'items', 'total'] as const;
  readonly paymentColumns = ['date', 'number', 'amount', 'method', 'order', 'note'] as const;

  readonly vm$: Observable<DetailVm> = combineLatest([
    this.refresh$,
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    this.auth.hasPermission$('purchase:read'),
    this.auth.hasPermission$('purchase:pay'),
    this.auth.hasPermission$('warehouse:all')
  ]).pipe(
    switchMap(([, id, canReadPurchases, canPay, allWarehouses]) => {
      if (!id) {
        return of<DetailVm>({ ...EMPTY, isLoading: false, errorMessage: 'ID fournisseur manquant' });
      }
      const supplier$ = this.api.getById(id);
      // Sans purchase:read, le backend refuse achats, paiements et compte : on ne les demande pas.
      const purchases$ = canReadPurchases
        ? forkJoin({
            history: this.api.purchaseHistory(id, allWarehouses).pipe(map((r) => r.items)),
            payments: this.api.payments(id).pipe(map((r) => r.items)),
            account: this.api.account(id)
          })
        : of({ history: [], payments: [], account: null });
      return forkJoin({ supplier: supplier$, purchases: purchases$ }).pipe(
        map(
          (r): DetailVm => ({
            isLoading: false,
            errorMessage: null,
            supplier: r.supplier,
            history: r.purchases.history,
            payments: r.purchases.payments,
            account: r.purchases.account,
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
