import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Sale } from '../../../core/models/sale.model';

export type CancelSaleDialogData = {
  sale: Sale;
};

/**
 * Confirmation de l'annulation d'une vente, motif obligatoire. Renvoie le motif, ou rien si
 * l'utilisateur renonce. Les conséquences affichées sont celles appliquées par le serveur.
 */
@Component({
  selector: 'app-cancel-sale-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Annuler la vente {{ data.sale.number }}</h2>
    <div mat-dialog-content>
      <p>
        <strong>{{ data.sale.customerName ?? 'Comptoir' }}</strong> — {{ data.sale.total | number: '1.0-0' }}
      </p>
      <ul class="hint">
        <li>Les articles sont remis en stock.</li>
        @if (data.sale.paidAmount > 0) {
          <li>Le montant payé ({{ data.sale.paidAmount | number: '1.0-0' }}) est remboursé depuis votre caisse ouverte.</li>
        }
        @if ((data.sale.creditAmount ?? 0) > 0) {
          <li>La dette du client ({{ data.sale.creditAmount | number: '1.0-0' }}) est annulée.</li>
        }
        <li>La vente reste visible, marquée « Annulée », avec ce motif.</li>
      </ul>
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
      <button mat-flat-button color="warn" type="button" (click)="confirm()">Annuler la vente</button>
    </div>
  `,
  styles: [
    `
      .full {
        width: 100%;
      }
      .hint {
        font-size: 13px;
        color: var(--color-text-secondary);
        padding-left: 18px;
        margin: 0 0 12px;
      }
    `
  ]
})
export class CancelSaleDialogComponent {
  private readonly ref = inject(MatDialogRef<CancelSaleDialogComponent, string>);
  readonly data = inject<CancelSaleDialogData>(MAT_DIALOG_DATA);

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
