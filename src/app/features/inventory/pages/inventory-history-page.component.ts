import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, map, of, startWith, take } from 'rxjs';

import { InventorySession } from '../../../core/models/inventory.model';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { InventoryApiService } from '../../../core/services/inventory-api.service';
import { InventorySessionDetailsDialogComponent } from '../ui/inventory-session-details-dialog.component';

type HistoryVm = {
  isLoading: boolean;
  errorMessage: string | null;
  sessions: InventorySession[];
};

@Component({
  selector: 'app-inventory-history-page',
  standalone: true,
  imports: [
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

  readonly displayedColumns = ['date', 'items', 'diff', 'actions'] as const;

  readonly vm$ = this.api.listSessions().pipe(
    map((r: PaginatedResult<InventorySession>) => ({ isLoading: false, errorMessage: null, sessions: r.items } satisfies HistoryVm)),
    startWith({ isLoading: true, errorMessage: null, sessions: [] } satisfies HistoryVm),
    catchError((e: unknown) =>
      of({ isLoading: false, errorMessage: e instanceof Error ? e.message : 'Erreur', sessions: [] } satisfies HistoryVm)
    )
  );

  openDetails(s: InventorySession): void {
    this.dialog.open(InventorySessionDetailsDialogComponent, { data: { session: s } });
  }
}
