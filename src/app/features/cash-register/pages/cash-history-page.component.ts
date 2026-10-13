import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { take } from 'rxjs';

import { CashOperation, CashRegisterSession, CashRegisterSessionStatus } from '../../../core/models/cash-register.model';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { CashRegisterFacade } from '../data/cash-register.facade';
import { CashSessionDetailsDialogComponent } from '../ui/cash-session-details-dialog.component';

import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { ServerTable } from '../../../shared/table/server-table';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-cash-history-page',
  standalone: true,
  imports: [
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

  readonly displayedColumns = ['openedAt', 'number', 'status', 'expected', 'counted', 'diff', 'actions'] as const;

  readonly statusOptions: { value: CashRegisterSessionStatus; label: string }[] = [
    { value: 'OPEN', label: 'Ouverte' },
    { value: 'CLOSED', label: 'Fermée' }
  ];

  /** Recherche, statut, période d'ouverture, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.sessionsPage(query, query.filters), {
    filters: new FormGroup({
      status: new FormControl<CashRegisterSessionStatus | null>(null),
      from: new FormControl<string | null>(null),
      to: new FormControl<string | null>(null)
    }),
    sortFields: { openedAt: 'openedAt', number: 'number' }
  });

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
