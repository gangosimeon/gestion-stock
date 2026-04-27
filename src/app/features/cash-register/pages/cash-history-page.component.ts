import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, map, of, startWith, take } from 'rxjs';

import { CashOperation, CashRegisterSession } from '../../../core/models/cash-register.model';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { CashRegisterFacade } from '../data/cash-register.facade';
import { CashSessionDetailsDialogComponent } from '../ui/cash-session-details-dialog.component';

type HistoryVm = {
  isLoading: boolean;
  errorMessage: string | null;
  sessions: CashRegisterSession[];
};

@Component({
  selector: 'app-cash-history-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './cash-history-page.component.html',
  styleUrl: './cash-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashHistoryPageComponent {
  private readonly facade = inject(CashRegisterFacade);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  readonly displayedColumns = ['openedAt', 'status', 'expected', 'counted', 'diff', 'actions'] as const;

  readonly vm$ = this.facade
    .sessions()
    .pipe(
      map((r: PaginatedResult<CashRegisterSession>) =>
        ({ isLoading: false, errorMessage: null, sessions: r.items } satisfies HistoryVm)
      ),
      startWith({ isLoading: true, errorMessage: null, sessions: [] } satisfies HistoryVm),
      catchError((e: unknown) =>
        of({ isLoading: false, errorMessage: e instanceof Error ? e.message : 'Erreur', sessions: [] } satisfies HistoryVm)
      )
    );

  openDetails(s: CashRegisterSession): void {
    this.facade.operationsBySession(s.id)
      .pipe(take(1))
      .subscribe({
        next: (r: PaginatedResult<CashOperation>) => {
          this.dialog.open(CashSessionDetailsDialogComponent, {
            data: { session: s, operations: r.items }
          });
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
