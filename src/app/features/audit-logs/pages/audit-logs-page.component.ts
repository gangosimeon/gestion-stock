import { AsyncPipe, CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, map, of, startWith, take } from 'rxjs';

import { AuditLogEntry } from '../../../core/models/audit-log.model';
import { AuditLogsApiService } from '../../../core/services/audit-logs-api.service';
import { PaginatedResult } from '../../../core/services/products-api.service';
import { AuditLogDetailsDialogComponent } from '../ui/audit-log-details-dialog.component';

type Vm = {
  isLoading: boolean;
  errorMessage: string | null;
  logs: AuditLogEntry[];
};

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DatePipe,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './audit-logs-page.component.html',
  styleUrl: './audit-logs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsPageComponent {
  private readonly api = inject(AuditLogsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  readonly displayedColumns = ['date', 'user', 'action', 'entity', 'warehouse', 'actions'] as const;

  readonly vm$ = this.api.list().pipe(
    map((r: PaginatedResult<AuditLogEntry>) => ({ isLoading: false, errorMessage: null, logs: r.items } satisfies Vm)),
    startWith({ isLoading: true, errorMessage: null, logs: [] } satisfies Vm),
    catchError((e: unknown) =>
      of({ isLoading: false, errorMessage: e instanceof Error ? e.message : 'Erreur', logs: [] } satisfies Vm)
    )
  );

  openDetails(l: AuditLogEntry): void {
    this.dialog.open(AuditLogDetailsDialogComponent, { data: { log: l } });
  }

  warehouseLabel(l: AuditLogEntry): string {
    const w = (l.meta?.['warehouseId'] as string | undefined) ?? '';
    return w || '—';
  }
}
