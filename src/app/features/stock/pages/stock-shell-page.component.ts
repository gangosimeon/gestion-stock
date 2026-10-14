import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Subject, takeUntil } from 'rxjs';

import { StockMovementType } from '../../../core/models/stock-movement.model';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { StockMovementRow, stockReasonLabels, stockTypeLabels } from '../data/stock-vm.model';
import { StockFacade } from '../data/stock.facade';
import { StockMovementDrawerComponent } from '../ui/stock-movement-drawer.component';
import { MatSelectModule } from '@angular/material/select';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

@Component({
  selector: 'app-stock-shell-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    SelectSearchComponent,
    MatSelectModule,
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
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

  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['date', 'product', 'type', 'qty', 'balance', 'user', 'reason'] as const;

  readonly typeOptions = Object.entries(stockTypeLabels).map(([value, label]) => ({ value: value as StockMovementType, label }));

  /** Recherche, période, produit, types, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
      productId: new FormControl<string | null>(null),
      types: new FormControl<StockMovementType[]>([], { nonNullable: true })
    }),
    sortFields: { date: 'createdAt', qty: 'quantity' },
    reload$: this.facade.refresh$
  });

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  constructor() {
    this.facade.refresh();
  }

  ngAfterViewInit(): void {
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

  /** Origine du mouvement (type détaillé du backend), sinon motif historique. */
  reasonLabel(m: StockMovementRow): string {
    return (m.type && stockTypeLabels[m.type]) || stockReasonLabels[m.reason];
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
