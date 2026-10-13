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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { BehaviorSubject, Observable, catchError, combineLatest, map, merge, of, shareReplay, skip, startWith, switchMap, take } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { CustomerPayment } from '../../../core/models/customer-payment.model';
import { PaymentMethod, Sale } from '../../../core/models/sale.model';
import { AuthService } from '../../../core/services/auth.service';
import { CreateCustomerPaymentRequest, CustomersApiService } from '../../../core/services/customers-api.service';
import { PayCustomerDialogComponent, PayCustomerDialogResult } from '../ui/pay-customer-dialog.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { ServerTable } from '../../../shared/table/server-table';

type DetailVm = {
  isLoading: boolean;
  errorMessage: string | null;
  /** Porte la dette (`balance`) et le crédit disponible, calculés par le backend. */
  customer: Customer | null;
  /** Permission sale:read : historique des ventes visible. */
  canReadSales: boolean;
  /** Permission customer:pay (interface seulement ; le backend la revérifie). */
  canPay: boolean;
};

const EMPTY: Omit<DetailVm, 'isLoading' | 'errorMessage'> = {
  customer: null,
  canReadSales: false,
  canPay: false
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile money',
  BANK_TRANSFER: 'Virement'
};

@Component({
  selector: 'app-client-detail-page',
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
    MatTableModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './client-detail-page.component.html',
  styleUrl: './client-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CustomersApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  /** Rechargement des historiques : après un règlement, ou en passant à un autre client. */
  private readonly reloadTables$ = merge(this.refresh$.pipe(skip(1)), this.route.paramMap.pipe(skip(1)));

  private get customerId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  /** Ventes du client : recherche, tri et pagination traités par le backend (sale:read requis). */
  readonly salesTable = new ServerTable<Sale>(
    (query) =>
      this.auth.hasPermission$('sale:read').pipe(
        take(1),
        switchMap((canRead) => (canRead ? this.api.salesHistoryPage(this.customerId, query) : of({ items: [] as Sale[], total: 0 })))
      ),
    { sortFields: { date: 'createdAt', number: 'number', total: 'total' }, reload$: this.reloadTables$ }
  );

  /** Règlements du client : recherche, tri et pagination traités par le backend. */
  readonly paymentsTable = new ServerTable<CustomerPayment>((query) => this.api.paymentsPage(this.customerId, query), {
    sortFields: { date: 'createdAt', amount: 'amount' },
    reload$: this.reloadTables$
  });

  readonly saleColumns = ['date', 'number', 'total', 'paid', 'due'] as const;
  readonly paymentColumns = ['date', 'reference', 'amount', 'method', 'note'] as const;

  readonly vm$: Observable<DetailVm> = combineLatest([
    this.refresh$,
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    this.auth.hasPermission$('sale:read'),
    this.auth.hasPermission$('customer:pay')
  ]).pipe(
    switchMap(([, id, canReadSales, canPay]) => {
      if (!id) {
        return of<DetailVm>({ ...EMPTY, isLoading: false, errorMessage: 'ID client manquant' });
      }
      // Historiques paginés à part (tableaux serveur) ; sans sale:read, les ventes ne sont pas demandées.
      return this.api.getById(id).pipe(
        map(
          (customer): DetailVm => ({
            isLoading: false,
            errorMessage: null,
            customer,
            canReadSales,
            canPay
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

  methodLabel(method: PaymentMethod | undefined): string {
    return method ? METHOD_LABELS[method] : '—';
  }

  receivePayment(vm: DetailVm): void {
    const customerId = vm.customer?.id;
    if (!customerId || !vm.canPay) return;

    this.dialog
      .open(PayCustomerDialogComponent, {
        data: {
          title: `Encaisser ${vm.customer?.name ?? ''}`,
          maxAmount: vm.customer?.balance
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((res: PayCustomerDialogResult | undefined) => {
        if (!res) return;

        const payload: CreateCustomerPaymentRequest = {
          amount: res.amount,
          paymentMethod: res.paymentMethod,
          note: res.note
        };

        this.api
          .createPayment(customerId, payload)
          .pipe(take(1))
          .subscribe({
            next: (p) => {
              this.snackbar.open(`Règlement ${p.reference ?? ''} encaissé`, 'OK', { duration: 2500 });
              this.refresh$.next(undefined);
            },
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }

  /** Part de la vente restée à crédit, calculée par le backend. */
  dueAmount(s: Sale): number | null {
    return s.creditAmount ?? null;
  }
}
