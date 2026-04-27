import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap, take } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { CustomerPayment } from '../../../core/models/customer-payment.model';
import { Sale } from '../../../core/models/sale.model';
import { CreateCustomerPaymentRequest, CustomersApiService } from '../../../core/services/customers-api.service';
import { PayCustomerDialogComponent, PayCustomerDialogResult } from '../ui/pay-customer-dialog.component';

type DetailVm = {
  isLoading: boolean;
  errorMessage: string | null;
  customer: Customer | null;
  sales: Sale[];
  payments: CustomerPayment[];
  totalPurchased: number;
  totalPaidOnSales: number;
  totalPayments: number;
  debt: number;
};

@Component({
  selector: 'app-client-detail-page',
  standalone: true,
  imports: [
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
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly saleColumns = ['date', 'total', 'paid', 'due'] as const;
  readonly paymentColumns = ['date', 'amount', 'note'] as const;

  readonly vm$ = this.refresh$.pipe(
    switchMap(() => this.route.paramMap.pipe(map((p) => p.get('id')))),
    switchMap((id) => {
      if (!id) {
        return of({
          isLoading: false,
          errorMessage: 'ID client manquant',
          customer: null,
          sales: [],
          payments: [],
          totalPurchased: 0,
          totalPaidOnSales: 0,
          totalPayments: 0,
          debt: 0
        } satisfies DetailVm);
      }

      return forkJoin({
        customer: this.api.getById(id),
        sales: this.api.salesHistory(id).pipe(map((r) => r.items)),
        payments: this.api.payments(id).pipe(map((r) => r.items))
      }).pipe(
        map((r): DetailVm => {
          const totalPurchased = r.sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
          const totalPaidOnSales = r.sales.reduce((acc, s) => acc + (Number(s.paidAmount) || 0), 0);
          const totalPayments = r.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          const debt = totalPurchased - totalPaidOnSales - totalPayments;

          return {
            isLoading: false,
            errorMessage: null,
            customer: r.customer,
            sales: r.sales,
            payments: r.payments,
            totalPurchased,
            totalPaidOnSales,
            totalPayments,
            debt
          };
        }),
        startWith({
          isLoading: true,
          errorMessage: null,
          customer: null,
          sales: [],
          payments: [],
          totalPurchased: 0,
          totalPaidOnSales: 0,
          totalPayments: 0,
          debt: 0
        } satisfies DetailVm),
        catchError((e: unknown) =>
          of({
            isLoading: false,
            errorMessage: e instanceof Error ? e.message : 'Erreur',
            customer: null,
            sales: [],
            payments: [],
            totalPurchased: 0,
            totalPaidOnSales: 0,
            totalPayments: 0,
            debt: 0
          } satisfies DetailVm)
        )
      );
    })
  );

  receivePayment(vm: DetailVm): void {
    const customerId = vm.customer?.id;
    if (!customerId) return;

    const max = vm.debt > 0 ? vm.debt : undefined;

    this.dialog
      .open(PayCustomerDialogComponent, {
        data: {
          title: `Encaisser ${vm.customer?.name ?? ''}`,
          maxAmount: max
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((res: PayCustomerDialogResult | undefined) => {
        if (!res) return;

        const payload: CreateCustomerPaymentRequest = {
          amount: res.amount,
          paymentDateIso: res.paymentDateIso,
          note: res.note
        };

        this.api
          .createPayment(customerId, payload)
          .pipe(take(1))
          .subscribe({
            next: () => {
              this.snackbar.open('Paiement enregistré', 'OK', { duration: 2500 });
              this.refresh$.next(undefined);
            },
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }

  dueAmount(s: Sale): number {
    return Math.max(0, (Number(s.total) || 0) - (Number(s.paidAmount) || 0));
  }
}
