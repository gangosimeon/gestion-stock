import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Subject, debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs';

import { PurchaseOrder, PurchaseOrderStatus } from '../../../core/models/purchase-order.model';
import { PurchasesFacade } from '../data/purchases.facade';
import { purchaseStatusLabels, PurchasesVm } from '../data/purchases-vm.model';
import { ConfirmReceiveDialogComponent } from '../ui/confirm-receive-dialog.component';
import { PurchaseDrawerComponent, PurchaseDrawerContext } from '../ui/purchase-drawer.component';
import { PaySupplierDialogComponent, PaySupplierDialogResult } from '../ui/pay-supplier-dialog.component';

@Component({
  selector: 'app-purchases-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSidenavModule,
    PurchaseDrawerComponent,
    // PaySupplierDialogComponent
  ],
  templateUrl: './purchases-shell-page.component.html',
  styleUrl: './purchases-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchasesShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(PurchasesFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('drawer') drawer!: MatSidenav;

  readonly search = new FormControl<string>('', { nonNullable: true });

  readonly displayedColumns = ['supplier', 'status', 'total', 'createdAt', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<PurchaseOrder>([]);

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: PurchasesVm = {
    isLoading: false,
    errorMessage: null,
    orders: [],
    suppliers: [],
    products: [],
    filter: ''
  };
  drawerCtx: PurchaseDrawerContext = { mode: 'CREATE', orderId: null, orders: [], suppliers: [], products: [] };

  readonly statusLabel = purchaseStatusLabels;

  statusLabelOf(status: PurchaseOrderStatus): string {
    return purchaseStatusLabels[status];
  }

  constructor() {
    this.facade.refresh();

    this.search.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v) => {
        this.dataSource.filter = v.trim().toLowerCase();
        if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.filterPredicate = (o: PurchaseOrder, filter: string) => {
      const v = `${o.supplierName} ${o.status} ${o.totalAmount}`.toLowerCase();
      return v.includes(filter);
    };

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = vm;
      this.dataSource.data = vm.orders;
    });

    this.drawer$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      if (d.opened) {
        this.drawerCtx = {
          mode: d.mode,
          orderId: d.orderId,
          orders: this.vmSnapshot.orders,
          suppliers: this.vmSnapshot.suppliers,
          products: this.vmSnapshot.products
        };
        void this.drawer.open();
      } else {
        void this.drawer.close();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreate(): void {
    this.facade.openCreate();
  }

  openDetail(o: PurchaseOrder): void {
    this.facade.openDetail(o.id);
  }

  closeDrawer(): void {
    this.facade.closeDrawer();
  }

  onSaved(): void {
    this.facade.closeDrawer();
  }

  confirmReceive(o: PurchaseOrder): void {
    if (o.status !== 'PENDING') return;

    this.dialog
      .open(ConfirmReceiveDialogComponent, {
        data: {
          title: 'Réception marchandise',
          message: `Valider la réception de la commande ${o.id} ? Le stock et le prix d'achat seront mis à jour.`
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok) => {
        if (!ok) return;

        (this.facade.receive(o.id) as any)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Réception validée', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }

  pay(o: PurchaseOrder): void {
    const remaining = Math.max(0, o.totalAmount - (o.paidAmount ?? 0));
    if (remaining <= 0) {
      this.snackbar.open('Commande déjà payée', 'OK', { duration: 2500 });
      return;
    }

    this.dialog
      .open(PaySupplierDialogComponent, {
        data: {
          title: `Payer commande ${o.id}`,
          maxAmount: remaining
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((res: PaySupplierDialogResult | undefined) => {
        if (!res) return;

        (this.facade.payOrder(o.id, {
          amount: res.amount,
          paymentDateIso: res.paymentDateIso,
          note: res.note
        }) as any)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Paiement enregistré', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
