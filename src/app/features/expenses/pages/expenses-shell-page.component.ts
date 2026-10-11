import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, finalize, switchMap, take } from 'rxjs';

import {
  Expense,
  ExpenseCategory,
  ExpenseFilter,
  ExpensePaymentMethod,
  ExpenseStatus,
  expenseCategoryLabels,
  expensePaymentMethodLabels,
  expenseStatusLabels
} from '../../../core/models/expense.model';
import { CreateExpenseRequest } from '../../../core/services/expenses-api.service';
import { ExpensesFacade, currentMonthFilter } from '../data/expenses.facade';
import { CancelExpenseDialogComponent, CancelExpenseDialogData } from '../ui/cancel-expense-dialog.component';

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-expenses-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './expenses-shell-page.component.html',
  styleUrl: './expenses-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesShellPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(ExpensesFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly vm$ = this.facade.vm$;

  readonly displayedColumns = ['date', 'number', 'category', 'label', 'paymentMethod', 'amount', 'status', 'actions'] as const;

  readonly categories = Object.keys(expenseCategoryLabels) as ExpenseCategory[];
  readonly paymentMethods = Object.keys(expensePaymentMethodLabels) as ExpensePaymentMethod[];
  readonly statuses = Object.keys(expenseStatusLabels) as ExpenseStatus[];
  readonly categoryLabels = expenseCategoryLabels;
  readonly paymentMethodLabels = expensePaymentMethodLabels;
  readonly statusLabels = expenseStatusLabels;

  readonly filterForm = this.fb.nonNullable.group({
    dateFrom: [currentMonthFilter().dateFrom ?? ''],
    dateTo: [currentMonthFilter().dateTo ?? ''],
    category: ['' as ExpenseCategory | ''],
    status: ['' as ExpenseStatus | ''],
    search: ['']
  });

  readonly form = this.fb.nonNullable.group({
    expenseDateIso: [today(), [Validators.required]],
    category: ['TRANSPORT' as ExpenseCategory, [Validators.required]],
    label: ['', [Validators.required, Validators.maxLength(200)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['CASH' as ExpensePaymentMethod, [Validators.required]],
    externalReference: ['', [Validators.maxLength(50)]],
    note: ['', [Validators.maxLength(500)]]
  });

  readonly maxDate = today();

  /** Libellé d'un code (ligne de tableau non typée), ou le code s'il est inconnu. */
  label(labels: Record<string, string>, code: string): string {
    return labels[code] ?? code;
  }
  isSubmitting = false;

  constructor() {
    this.facade.refresh();
  }

  applyFilters(): void {
    const raw = this.filterForm.getRawValue();
    const f: ExpenseFilter = {};
    if (raw.dateFrom) f.dateFrom = raw.dateFrom;
    if (raw.dateTo) f.dateTo = raw.dateTo;
    if (raw.category) f.category = raw.category;
    if (raw.status) f.status = raw.status;
    if (raw.search.trim()) f.search = raw.search.trim();
    this.facade.applyFilter(f);
  }

  resetFilters(): void {
    const month = currentMonthFilter();
    this.filterForm.reset({ dateFrom: month.dateFrom, dateTo: month.dateTo, category: '', status: '', search: '' });
    this.facade.applyFilter(month);
  }

  onPage(e: PageEvent): void {
    this.facade.changePage(e.pageIndex, e.pageSize);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreateExpenseRequest = {
      expenseDateIso: raw.expenseDateIso,
      category: raw.category,
      label: raw.label.trim(),
      amount: Number(raw.amount),
      paymentMethod: raw.paymentMethod,
      externalReference: raw.externalReference.trim() || undefined,
      note: raw.note.trim() || undefined
    };
    if (!payload.label) {
      this.form.controls.label.setErrors({ required: true });
      return;
    }

    this.isSubmitting = true;
    this.form.disable();
    this.facade
      .create(payload)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: (created) => {
          const where = created.paymentMethod === 'CASH' ? ' — sortie de votre caisse' : '';
          this.snackbar.open(`Dépense ${created.number} enregistrée${where}`, 'OK', { duration: 3000 });
          this.form.reset(
            { expenseDateIso: today(), category: raw.category, label: '', amount: 0, paymentMethod: raw.paymentMethod, externalReference: '', note: '' },
            { emitEvent: false }
          );
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 4000 })
      });
  }

  cancel(e: Expense): void {
    const data: CancelExpenseDialogData = { expense: e };
    this.dialog
      .open(CancelExpenseDialogComponent, { data, width: '460px' })
      .afterClosed()
      .pipe(
        take(1),
        filter((reason: string | undefined): reason is string => !!reason),
        switchMap((reason) => this.facade.cancel(e.id, reason))
      )
      .subscribe({
        next: (cancelled) => {
          const back = cancelled.paymentMethod === 'CASH' ? ' — montant remis dans votre caisse' : '';
          this.snackbar.open(`Dépense ${cancelled.number} annulée${back}`, 'OK', { duration: 3000 });
        },
        error: (err: unknown) => this.snackbar.open(err instanceof Error ? err.message : 'Erreur', 'OK', { duration: 4000 })
      });
  }
}
