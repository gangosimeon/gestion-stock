import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, catchError, finalize, forkJoin, map, of, startWith, switchMap, take } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { SupplierPurchaseHistory } from '../../../core/models/supplier-purchase-history.model';
import { SupplierPayment } from '../../../core/models/supplier-payment.model';
import { CreateSupplierPaymentRequest, SuppliersApiService } from '../../../core/services/suppliers-api.service';
import { PaySupplierDialogComponent, PaySupplierDialogResult } from '../ui/pay-supplier-dialog.component';

type DetailVm = {
  isLoading: boolean;
  errorMessage: string | null;
  supplier: Supplier | null;
  history: SupplierPurchaseHistory[];
  payments: SupplierPayment[];
  totalPurchases: number;
  totalPaid: number;
  balance: number;
};

@Component({
  selector: 'app-supplier-detail-page',
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
    // PaySupplierDialogComponent
  ],
  templateUrl: './supplier-detail-page.component.html',
  styleUrl: './supplier-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SuppliersApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly displayedColumns = ['date', 'reference', 'items', 'total'] as const;
  readonly paymentColumns = ['date', 'amount', 'order', 'note'] as const;

  readonly vm$ = this.refresh$.pipe(
    switchMap(() => this.route.paramMap.pipe(map((p) => p.get('id')))),
    switchMap((id) => {
      if (!id) {
        return of({
          isLoading: false,
          errorMessage: 'ID fournisseur manquant',
          supplier: null,
          history: [],
          payments: [],
          totalPurchases: 0,
          totalPaid: 0,
          balance: 0
        } satisfies DetailVm);
      }

      return forkJoin({
        supplier: this.api.getById(id),
        history: this.api.purchaseHistory(id).pipe(map((r) => r.items)),
        payments: this.api.payments(id).pipe(map((r) => r.items))
      }).pipe(
        map((r): DetailVm => {
          const totalPurchases = r.history.reduce((acc, h) => acc + (Number(h.totalAmount) || 0), 0);
          const totalPaid = r.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          const balance = totalPurchases - totalPaid;

          return {
            isLoading: false,
            errorMessage: null,
            supplier: r.supplier,
            history: r.history,
            payments: r.payments,
            totalPurchases,
            totalPaid,
            balance
          };
        }),
        startWith({
          isLoading: true,
          errorMessage: null,
          supplier: null,
          history: [],
          payments: [],
          totalPurchases: 0,
          totalPaid: 0,
          balance: 0
        } satisfies DetailVm),
        catchError((e: unknown) =>
          of({
            isLoading: false,
            errorMessage: e instanceof Error ? e.message : 'Erreur',
            supplier: null,
            history: [],
            payments: [],
            totalPurchases: 0,
            totalPaid: 0,
            balance: 0
          } satisfies DetailVm)
        ),
        finalize(() => {})
      );
    })
  );

  paySupplier(vm: DetailVm): void {
    const supplierId = vm.supplier?.id;
    if (!supplierId) return;

    const remaining = Math.max(0, vm.balance);

    this.dialog
      .open(PaySupplierDialogComponent, {
        data: {
          title: `Payer ${vm.supplier?.name ?? ''}`,
          maxAmount: remaining > 0 ? remaining : undefined
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((res: PaySupplierDialogResult | undefined) => {
        if (!res) return;

        const payload: CreateSupplierPaymentRequest = {
          amount: res.amount,
          paymentDateIso: res.paymentDateIso,
          note: res.note
        };

        this.api
          .createPayment(supplierId, payload)
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
}
