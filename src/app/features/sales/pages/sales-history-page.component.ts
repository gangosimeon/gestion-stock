import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, forkJoin, switchMap, take } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import { CustomerReturn, CreateCustomerReturnRequest } from '../../../core/models/customer-return.model';
import { PaymentMethod, Sale, SaleStatus } from '../../../core/models/sale.model';
import { SalesApiService } from '../../../core/services/sales-api.service';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { paymentMethodLabels } from '../data/sales-vm.model';
import { hasReturnableItems, returnableLines } from '../data/returns.model';
import { CancelSaleDialogComponent, CancelSaleDialogData } from '../ui/cancel-sale-dialog.component';
import { CustomerReturnDialogComponent, CustomerReturnDialogData } from '../ui/customer-return-dialog.component';
import { InvoiceDrawerComponent } from '../ui/invoice-drawer.component';

/**
 * Historique des ventes du dépôt courant (ou de tous les dépôts avec warehouse:all) :
 * recherche, filtres, tri et pagination côté serveur ; facture à revoir et à réimprimer ;
 * annulation (sale:cancel) avec motif.
 */
@Component({
  selector: 'app-sales-history-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    DatePickerDirective,
    FilterResetComponent,
    InvoiceDrawerComponent
  ],
  templateUrl: './sales-history-page.component.html',
  styleUrl: './sales-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesHistoryPageComponent {
  private readonly api = inject(SalesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  @ViewChild('invoiceDrawer') invoiceDrawer!: MatDrawer;

  /** Interface seulement : le serveur contrôle chaque droit. */
  readonly canSell = this.auth.hasPermission('sale:create');
  readonly canCancel = this.auth.hasPermission('sale:cancel');
  readonly canReturn = this.auth.hasPermission('return:create');
  readonly canSeeAllWarehouses = this.auth.hasPermission('warehouse:all');

  readonly displayedColumns = ['createdAt', 'number', 'customer', 'total', 'paid', 'credit', 'status', 'actions'] as const;

  readonly statusOptions: { value: SaleStatus; label: string }[] = [
    { value: 'COMPLETED', label: 'Terminée' },
    { value: 'CANCELLED', label: 'Annulée' }
  ];

  readonly paymentOptions = (Object.keys(paymentMethodLabels) as PaymentMethod[]).map((value) => ({
    value,
    label: paymentMethodLabels[value]
  }));

  paymentLabel(method: PaymentMethod | null | undefined): string {
    return method ? (paymentMethodLabels[method] ?? method) : '';
  }

  /** Recherche (n°, client), statut, paiement, période, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.api.salesPage(query, query.filters), {
    filters: new FormGroup({
      status: new FormControl<SaleStatus | null>(null),
      paymentMethod: new FormControl<PaymentMethod | null>(null),
      from: new FormControl<string | null>(null),
      to: new FormControl<string | null>(null),
      allWarehouses: new FormControl<boolean>(false, { nonNullable: true })
    }),
    sortFields: { createdAt: 'createdAt', number: 'number', customer: 'customerName', total: 'total' }
  });

  /** Vente affichée dans le volet de facture, et ses retours. */
  readonly selected = signal<Sale | null>(null);
  readonly selectedReturns = signal<CustomerReturn[]>([]);

  /** Facture : détail relu sur le serveur (statut à jour) et retours déjà enregistrés. */
  openInvoice(row: Sale): void {
    forkJoin([this.api.get(row.id), this.api.returnsForSale(row.id)])
      .pipe(take(1))
      .subscribe({
        next: ([sale, returns]) => {
          this.selected.set(sale);
          this.selectedReturns.set(returns);
          void this.invoiceDrawer.open();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 4000 })
      });
  }

  /** Retour client : quantités restantes calculées à partir des retours déjà enregistrés. */
  returnSale(row: Sale): void {
    forkJoin([this.api.get(row.id), this.api.returnsForSale(row.id)])
      .pipe(
        take(1),
        switchMap(([sale, returns]) => {
          if (!hasReturnableItems(returnableLines(sale, returns))) {
            throw new Error('Tous les articles de cette vente ont déjà été retournés.');
          }
          const data: CustomerReturnDialogData = { sale, returns };
          return this.dialog
            .open(CustomerReturnDialogComponent, { data, width: '640px', maxWidth: '95vw' })
            .afterClosed();
        }),
        filter((request: CreateCustomerReturnRequest | undefined): request is CreateCustomerReturnRequest => !!request),
        switchMap((request) => this.api.createReturn(row.id, request))
      )
      .subscribe({
        next: (created) => {
          const how = created.settlement === 'REFUND' ? 'remboursés' : 'crédités sur la dette du client';
          this.snackbar.open(`Retour ${created.number} enregistré : ${created.totalAmount} ${how}`, 'OK', { duration: 4000 });
          if (this.selected()?.id === row.id) this.selectedReturns.update((list) => [...list, created]);
          this.table.reload();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 5000 })
      });
  }

  closeInvoice(): void {
    void this.invoiceDrawer.close();
  }

  cancel(sale: Sale): void {
    const data: CancelSaleDialogData = { sale };
    this.dialog
      .open(CancelSaleDialogComponent, { data, width: '480px' })
      .afterClosed()
      .pipe(
        take(1),
        filter((reason: string | undefined): reason is string => !!reason),
        switchMap((reason) => this.api.cancel(sale.id, reason))
      )
      .subscribe({
        next: (cancelled) => {
          this.snackbar.open(`Vente ${cancelled.number ?? ''} annulée`, 'OK', { duration: 3000 });
          if (this.selected()?.id === cancelled.id) this.selected.set(cancelled);
          this.table.reload();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 5000 })
      });
  }
}
