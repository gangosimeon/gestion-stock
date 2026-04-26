import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Subject, takeUntil } from 'rxjs';

import { StockMovementRow, stockReasonLabels } from '../data/stock-vm.model';
import { StockFacade } from '../data/stock.facade';
import { StockMovementDrawerComponent } from '../ui/stock-movement-drawer.component';

@Component({
  selector: 'app-stock-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
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
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSidenavModule,
    StockMovementDrawerComponent
  ],
  templateUrl: './stock-shell-page.component.html',
  styleUrl: './stock-shell-page.component.scss'
})
export class StockShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(StockFacade);
  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['date', 'product', 'type', 'qty', 'user', 'reason'] as const;
  readonly dataSource = new MatTableDataSource<StockMovementRow>([]);

  readonly from = new FormControl<Date | null>(null);
  readonly to = new FormControl<Date | null>(null);
  readonly productId = new FormControl<string | null>(null);

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: { products: any[] } = { products: [] };

  constructor() {
    this.facade.refresh();

    this.from.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setFilters({ from: v }));
    this.to.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setFilters({ to: v }));
    this.productId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => this.facade.setFilters({ productId: v }));
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot.products = vm.products;
      this.dataSource.data = vm.movements;

      this.from.setValue(vm.filters.from, { emitEvent: false });
      this.to.setValue(vm.filters.to, { emitEvent: false });
      this.productId.setValue(vm.filters.productId, { emitEvent: false });
    });

    this.drawer$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      if (d.opened) void this.drawer.open();
      else void this.drawer.close();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreate(): void {
    this.facade.openDrawer();
  }

  closeDrawer(): void {
    this.facade.closeDrawer();
  }

  onSaved(): void {
    this.facade.closeDrawer();
  }

  reasonLabel(reason: StockMovementRow['reason']): string {
    return stockReasonLabels[reason];
  }

  chipColor(m: StockMovementRow): 'primary' | 'warn' {
    return m.uiType === 'IN' ? 'primary' : 'warn';
  }

  typeLabel(m: StockMovementRow): string {
    return m.uiType === 'IN' ? 'Entrée' : 'Sortie';
  }

  formatQty(m: StockMovementRow): string {
    const abs = Math.abs(m.quantity);
    return m.uiType === 'IN' ? `+${abs}` : `-${abs}`;
  }
}
