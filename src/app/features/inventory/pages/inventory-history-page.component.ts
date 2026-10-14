import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { InventorySession, InventoryStatus, inventoryStatusLabels } from '../../../core/models/inventory.model';
import { InventoryApiService } from '../../../core/services/inventory-api.service';
import { InventorySessionDetailsDialogComponent } from '../ui/inventory-session-details-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-inventory-history-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DatePickerDirective,
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './inventory-history-page.component.html',
  styleUrl: './inventory-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryHistoryPageComponent {
  private readonly api = inject(InventoryApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  readonly displayedColumns = ['date', 'number', 'status', 'items', 'diff', 'actions'] as const;
  statusLabel(s: InventorySession): string {
    return s.status ? inventoryStatusLabels[s.status] : '—';
  }

  readonly statusOptions = Object.entries(inventoryStatusLabels).map(([value, label]) => ({ value: value as InventoryStatus, label }));

  /** Recherche, statut, période, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.api.listSessionsPage(query, query.filters), {
    filters: new FormGroup({
      status: new FormControl<InventoryStatus | null>(null),
      from: new FormControl<string | null>(null),
      to: new FormControl<string | null>(null)
    }),
    sortFields: { date: 'createdAt', number: 'number' }
  });

  openDetails(s: InventorySession): void {
    this.dialog.open(InventorySessionDetailsDialogComponent, { data: { session: s } });
  }
}
