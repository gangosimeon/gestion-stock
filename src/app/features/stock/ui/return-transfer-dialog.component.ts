import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { StockTransfer } from '../../../core/models/stock-transfer.model';

export type ReturnTransferDialogData = {
  transfer: StockTransfer;
};

/** Résultat : motif saisi (éventuellement vide). Rien si l'utilisateur renonce. */
export type ReturnTransferDialogResult = { reason: string };

/**
 * Confirmation du retour d'un transfert au dépôt d'origine, motif facultatif. Les conséquences
 * affichées sont celles appliquées par le serveur.
 */
@Component({
  selector: 'app-return-transfer-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Retourner le transfert {{ data.transfer.number }}</h2>
    <div mat-dialog-content>
      <ul class="products">
        @for (l of data.transfer.lines; track l.lineNumber) {
          <li><strong>{{ l.productName }}</strong> × {{ l.quantity }}</li>
        }
      </ul>
      <ul class="hint">
        <li>
          {{ data.transfer.totalQuantity }} unité(s) sortent de <strong>{{ data.transfer.toWarehouseName }}</strong> et
          reviennent à <strong>{{ data.transfer.fromWarehouseName }}</strong>, tous les produits ensemble.
        </li>
        <li>Refusé si le dépôt de destination n'a plus l'un de ces produits.</li>
        <li>Le transfert reste visible, marqué « Retourné ». Un transfert ne se retourne qu'une fois.</li>
      </ul>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Motif du retour (facultatif)</mat-label>
        <textarea matInput [formControl]="reason" rows="3" maxlength="500"></textarea>
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Ne pas retourner</button>
      <button mat-flat-button color="warn" type="button" (click)="confirm()">Retourner le stock</button>
    </div>
  `,
  styles: [
    `
      .full {
        width: 100%;
      }
      .products {
        margin: 0 0 12px;
        padding-left: 18px;
        max-height: 200px;
        overflow: auto;
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
export class ReturnTransferDialogComponent {
  private readonly ref = inject(MatDialogRef<ReturnTransferDialogComponent, ReturnTransferDialogResult>);
  readonly data = inject<ReturnTransferDialogData>(MAT_DIALOG_DATA);

  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] });

  confirm(): void {
    this.ref.close({ reason: this.reason.value.trim() });
  }
}
