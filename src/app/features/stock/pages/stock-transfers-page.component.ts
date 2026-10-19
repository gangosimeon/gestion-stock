import { AsyncPipe, CommonModule } from '@angular/common';
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
import { filter, switchMap, take } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import {
  StockTransfer,
  StockTransferDirection,
  StockTransferStatus,
  stockTransferDirectionLabels,
  stockTransferStatusLabels
} from '../../../core/models/stock-transfer.model';
import { StockApiService } from '../../../core/services/stock-api.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import {
  ReturnTransferDialogComponent,
  ReturnTransferDialogData,
  ReturnTransferDialogResult
} from '../ui/return-transfer-dialog.component';
import { TransferReceiptDrawerComponent } from '../ui/transfer-receipt-drawer.component';

/**
 * Historique des transferts envoyés par le dépôt courant ou reçus par lui (tous les dépôts
 * avec warehouse:all) : recherche, filtres, tri et pagination côté serveur ; reçu à revoir et
 * à réimprimer ; retour du stock au dépôt d'origine (stock:transfer).
 */
@Component({
  selector: 'app-stock-transfers-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
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
    TransferReceiptDrawerComponent
  ],
  templateUrl: './stock-transfers-page.component.html',
  styleUrl: './stock-transfers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockTransfersPageComponent {
  private readonly api = inject(StockApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly warehouseCtx = inject(WarehouseContextService);

  @ViewChild('receiptDrawer') receiptDrawer!: MatDrawer;

  /** Interface seulement : le serveur contrôle chaque droit. */
  readonly canTransfer = this.auth.hasPermission('stock:transfer');
  readonly canSeeAllWarehouses = this.auth.hasPermission('warehouse:all');

  readonly displayedColumns = [
    'createdAt',
    'number',
    'direction',
    'route',
    'product',
    'quantity',
    'status',
    'user',
    'actions'
  ] as const;

  readonly directionOptions = (Object.keys(stockTransferDirectionLabels) as StockTransferDirection[]).map((value) => ({
    value,
    label: value === 'SENT' ? 'Envoyés' : 'Reçus'
  }));

  readonly statusOptions = (Object.keys(stockTransferStatusLabels) as StockTransferStatus[]).map((value) => ({
    value,
    label: stockTransferStatusLabels[value]
  }));

  statusLabel(t: StockTransfer): string {
    return stockTransferStatusLabels[t.status] ?? t.status;
  }

  /** Recherche (n°, produit, note), sens, statut, période, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.api.findTransfersPage(query, query.filters), {
    // Autre dépôt : envoyés et reçus changent.
    reload$: this.warehouseCtx.warehouseChanged$,
    filters: new FormGroup({
      direction: new FormControl<StockTransferDirection | null>(null),
      status: new FormControl<StockTransferStatus | null>(null),
      from: new FormControl<string | null>(null),
      to: new FormControl<string | null>(null),
      allWarehouses: new FormControl<boolean>(false, { nonNullable: true })
    }),
    sortFields: { createdAt: 'createdAt', number: 'number' }
  });

  /** « Ciment, Fer et 2 autres » : premiers produits du transfert. */
  productsSummary(t: StockTransfer): string {
    const names = t.lines.map((l) => l.productName);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} et ${names.length - 2} autre(s)`;
  }

  /** Détail des lignes au survol. */
  linesTooltip(t: StockTransfer): string {
    return t.lines.map((l) => `${l.quantity} × ${l.productName}`).join('\n');
  }

  /** Transfert affiché dans le volet du reçu. */
  readonly selected = signal<StockTransfer | null>(null);

  /** Sens vu du dépôt courant (vue tous dépôts : ni envoyé ni reçu par lui). */
  direction(t: StockTransfer): StockTransferDirection | null {
    const current = this.warehouseCtx.warehouseId;
    if (t.fromWarehouseId === current) return 'SENT';
    if (t.toWarehouseId === current) return 'RECEIVED';
    return null;
  }

  directionLabel(t: StockTransfer): string {
    const d = this.direction(t);
    return d ? stockTransferDirectionLabels[d] : '—';
  }

  /** Retour possible depuis l'un des deux dépôts du transfert, une seule fois. */
  canReturn(t: StockTransfer): boolean {
    return this.canTransfer && t.status === 'COMPLETED' && this.direction(t) !== null;
  }

  /** Reçu : détail relu sur le serveur (statut à jour). */
  openReceipt(row: StockTransfer): void {
    this.api
      .getTransfer(row.id)
      .pipe(take(1))
      .subscribe({
        next: (transfer) => {
          this.selected.set(transfer);
          void this.receiptDrawer.open();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 4000 })
      });
  }

  closeReceipt(): void {
    void this.receiptDrawer.close();
  }

  returnTransfer(row: StockTransfer): void {
    const data: ReturnTransferDialogData = { transfer: row };
    this.dialog
      .open(ReturnTransferDialogComponent, { data, width: '520px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(
        take(1),
        filter((result: ReturnTransferDialogResult | undefined): result is ReturnTransferDialogResult => !!result),
        switchMap((result) => this.api.returnTransfer(row.id, result.reason))
      )
      .subscribe({
        next: (returned) => {
          this.snackbar.open(`Transfert ${returned.number} retourné à ${returned.fromWarehouseName}`, 'OK', { duration: 4000 });
          if (this.selected()?.id === returned.id) this.selected.set(returned);
          this.table.reload();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 5000 })
      });
  }
}
