import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Expense } from '../../../core/models/expense.model';

export type CancelExpenseDialogData = {
  expense: Expense;
};

/** Demande le motif d'annulation ; renvoie le motif, ou rien si l'utilisateur renonce. */
@Component({
  selector: 'app-cancel-expense-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Annuler la dépense {{ data.expense.number }}</h2>
    <div mat-dialog-content>
      <p>
        <strong>{{ data.expense.label }}</strong> — {{ data.expense.amount | number: '1.0-0' }}
      </p>
      <p class="hint">
        La dépense reste visible, avec ce motif, mais ne compte plus dans les totaux.
        @if (data.expense.paymentMethod === 'CASH') {
          Payée en espèces : le montant sera remis dans votre caisse ouverte.
        }
      </p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Motif de l'annulation</mat-label>
        <textarea matInput [formControl]="reason" rows="3" maxlength="500"></textarea>
        @if (reason.touched && reason.invalid) {
          <mat-error>Motif obligatoire</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Ne pas annuler</button>
      <button mat-flat-button color="warn" type="button" (click)="confirm()">Annuler la dépense</button>
    </div>
  `,
  styles: [
    `
      .full {
        width: 100%;
      }
      .hint {
        font-size: 13px;
        color: #64748b;
      }
    `
  ]
})
export class CancelExpenseDialogComponent {
  private readonly ref = inject(MatDialogRef<CancelExpenseDialogComponent, string>);
  readonly data = inject<CancelExpenseDialogData>(MAT_DIALOG_DATA);

  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] });

  confirm(): void {
    const value = this.reason.value.trim();
    if (!value) {
      this.reason.setValue('');
      this.reason.markAsTouched();
      return;
    }
    this.ref.close(value);
  }
}
