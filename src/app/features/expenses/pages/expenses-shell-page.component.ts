import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize, take } from 'rxjs';

import { Expense } from '../../../core/models/expense.model';
import { CreateExpenseRequest } from '../../../core/services/expenses-api.service';
import { ExpensesFacade } from '../data/expenses.facade';
import { ConfirmDeleteExpenseDialogComponent } from '../ui/confirm-delete-expense-dialog.component';

const expenseCategories = [
  { id: 'transport', label: 'Transport' },
  { id: 'salary', label: 'Salaire' },
  { id: 'rent', label: 'Loyer' },
  { id: 'utilities', label: 'Électricité / Eau' },
  { id: 'supplies', label: 'Fournitures' },
  { id: 'other', label: 'Autre' }
] as const;

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
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    // ConfirmDeleteExpenseDialogComponent
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

  readonly displayedColumns = ['date', 'category', 'label', 'amount', 'note', 'actions'] as const;

  readonly categories = expenseCategories;

  readonly form = this.fb.nonNullable.group({
    expenseDateIso: [new Date().toISOString().slice(0, 10), [Validators.required]],
    category: [expenseCategories[0].id, [Validators.required]],
    label: ['', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  isSubmitting = false;

  constructor() {
    this.facade.refresh();
  }

  categoryLabel(id: string): string {
    return this.categories.find((c) => c.id === id)?.label ?? id;
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
      note: raw.note.trim() ? raw.note.trim() : undefined
    };

    if (!payload.label) {
      this.snackbar.open('Libellé requis', 'OK', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    (this.facade.create(payload) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Dépense enregistrée', 'OK', { duration: 2500 });
          this.form.reset(
            {
              expenseDateIso: new Date().toISOString().slice(0, 10),
              category: expenseCategories[0].id,
              label: '',
              amount: 0,
              note: ''
            },
            { emitEvent: false }
          );
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  confirmDelete(e: Expense): void {
    this.dialog
      .open(ConfirmDeleteExpenseDialogComponent, { data: { label: e.label } })
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok: boolean | undefined) => {
        if (!ok) return;

        (this.facade.delete(e.id) as any)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Dépense supprimée', 'OK', { duration: 2500 }),
            error: (err: unknown) =>
              this.snackbar.open(err instanceof Error ? err.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
