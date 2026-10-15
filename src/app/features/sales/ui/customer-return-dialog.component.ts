import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { map, startWith } from 'rxjs';

import {
  CreateCustomerReturnRequest,
  CustomerReturn,
  ItemCondition,
  ReturnSettlement,
  conditionLabels
} from '../../../core/models/customer-return.model';
import { PaymentMethod, Sale } from '../../../core/models/sale.model';
import { paymentMethodLabels } from '../data/sales-vm.model';
import { ReturnableLine, estimateReturn, returnableLines } from '../data/returns.model';

export type CustomerReturnDialogData = {
  sale: Sale;
  /** Retours déjà enregistrés sur la vente (quantités restantes). */
  returns: CustomerReturn[];
};

/**
 * Saisie d'un retour client : articles et quantités (plafonnées à ce qui reste à rendre),
 * état de chaque article, règlement et motif. Renvoie la requête, ou rien si l'utilisateur
 * renonce. Aucun montant n'est envoyé : le serveur le calcule au prix net de la vente.
 */
@Component({
  selector: 'app-customer-return-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Retour sur la vente {{ data.sale.number }}</h2>
    <div mat-dialog-content [formGroup]="form">
      <p class="intro">
        <strong>{{ data.sale.customerName ?? 'Comptoir' }}</strong> — vente de {{ data.sale.total | number: '1.0-0' }}
      </p>

      <div class="lines" formArrayName="lines">
        @for (line of lines; track line.productId; let i = $index) {
          <div class="line" [formGroupName]="i" [class.line--done]="line.remaining === 0">
            <div class="line__product">
              <div class="line__name">{{ line.productName }}</div>
              <div class="line__meta">
                {{ line.productSku }} · vendu {{ line.sold }}
                @if (line.alreadyReturned > 0) { · déjà retourné {{ line.alreadyReturned }} }
                · {{ line.unitNet | number: '1.0-0' }} / unité
              </div>
            </div>
            @if (line.remaining > 0) {
              <mat-form-field appearance="outline" class="line__qty" subscriptSizing="dynamic">
                <mat-label>Qté (max {{ line.remaining }})</mat-label>
                <input matInput type="number" min="0" [max]="line.remaining" formControlName="quantity" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="line__condition" subscriptSizing="dynamic">
                <mat-label>État</mat-label>
                <mat-select formControlName="condition">
                  @for (c of conditions; track c.value) {
                    <mat-option [value]="c.value">{{ c.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else {
              <span class="line__none">Tout a déjà été retourné</span>
            }
          </div>
        }
      </div>

      <div class="settlement">
        <div class="label">Règlement</div>
        <mat-radio-group formControlName="settlement">
          <mat-radio-button value="REFUND">Rembourser le client</mat-radio-button>
          <mat-radio-button value="ACCOUNT_CREDIT" [disabled]="!data.sale.customerId">
            Avoir sur sa dette
          </mat-radio-button>
        </mat-radio-group>
        @if (form.controls.settlement.value === 'REFUND') {
          <mat-form-field appearance="outline" class="method" subscriptSizing="dynamic">
            <mat-label>Moyen de remboursement</mat-label>
            <mat-select formControlName="refundMethod">
              @for (m of methods; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <p class="hint">Sorti de votre caisse ouverte, dans la limite de ce que le client a payé sur cette vente.</p>
        } @else {
          <p class="hint">Déduit de la dette du client, dans la limite de ce qu'il doit.</p>
        }
        @if (!data.sale.customerId) {
          <p class="hint">Vente au comptoir : seul le remboursement est possible.</p>
        }
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Motif du retour</mat-label>
        <textarea matInput formControlName="reason" rows="2" maxlength="500"></textarea>
        @if (form.controls.reason.touched && form.controls.reason.invalid) {
          <mat-error>Motif obligatoire</mat-error>
        }
      </mat-form-field>

      <div class="estimate">
        Montant estimé : <strong>{{ estimate() | number: '1.0-0' }}</strong>
        <span class="hint">(montant définitif calculé par le serveur)</span>
      </div>
      @if (error) {
        <div class="error">{{ error }}</div>
      }
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">Enregistrer le retour</button>
    </div>
  `,
  styles: [
    `
      .intro {
        margin-top: 0;
      }
      .lines {
        display: grid;
        gap: 10px;
        margin-bottom: 12px;
      }
      .line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
      }
      .line--done {
        opacity: 0.6;
      }
      .line__product {
        flex: 1 1 220px;
        min-width: 0;
      }
      .line__name {
        font-weight: 600;
      }
      .line__meta,
      .hint,
      .line__none {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .line__qty {
        flex: 0 0 120px;
      }
      .line__condition {
        flex: 1 1 200px;
      }
      .settlement {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
      }
      .settlement .label {
        font-size: 12px;
        opacity: 0.7;
      }
      .settlement mat-radio-group {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
      }
      .method {
        max-width: 280px;
      }
      .full {
        width: 100%;
      }
      .estimate {
        font-size: 14px;
      }
      .error {
        color: var(--color-danger);
        margin-top: 8px;
      }
    `
  ]
})
export class CustomerReturnDialogComponent {
  private readonly ref = inject(MatDialogRef<CustomerReturnDialogComponent, CreateCustomerReturnRequest>);
  readonly data = inject<CustomerReturnDialogData>(MAT_DIALOG_DATA);

  readonly lines: ReturnableLine[] = returnableLines(this.data.sale, this.data.returns);

  readonly conditions = (Object.keys(conditionLabels) as ItemCondition[]).map((value) => ({
    value,
    label: conditionLabels[value]
  }));

  readonly methods = (Object.keys(paymentMethodLabels) as PaymentMethod[]).map((value) => ({
    value,
    label: paymentMethodLabels[value]
  }));

  readonly form = new FormGroup({
    lines: new FormArray(
      this.lines.map(
        (l) =>
          new FormGroup({
            quantity: new FormControl(0, {
              nonNullable: true,
              validators: [Validators.min(0), Validators.max(l.remaining)]
            }),
            condition: new FormControl<ItemCondition>('RESELLABLE', { nonNullable: true })
          })
      )
    ),
    settlement: new FormControl<ReturnSettlement>('REFUND', { nonNullable: true }),
    refundMethod: new FormControl<PaymentMethod>(this.data.sale.paymentMethod ?? 'CASH', { nonNullable: true }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] })
  });

  readonly estimate = toSignal(
    this.form.controls.lines.valueChanges.pipe(
      startWith(this.form.controls.lines.getRawValue()),
      map(() => estimateReturn(this.lines, this.quantities()))
    ),
    { initialValue: 0 }
  );

  error: string | null = null;

  private quantities(): Record<string, number> {
    const values = this.form.controls.lines.getRawValue();
    return Object.fromEntries(this.lines.map((l, i) => [l.productId, Number(values[i]?.quantity) || 0]));
  }

  confirm(): void {
    this.form.markAllAsTouched();
    const values = this.form.getRawValue();
    const items = this.lines
      .map((l, i) => ({
        productId: l.productId,
        quantity: Math.floor(Number(values.lines[i].quantity) || 0),
        condition: values.lines[i].condition
      }))
      .filter((it) => it.quantity > 0);

    if (items.length === 0) {
      this.error = 'Indiquez au moins un article à retourner.';
      return;
    }
    if (this.form.invalid) {
      this.error = !values.reason.trim()
        ? 'Le motif du retour est obligatoire.'
        : 'Une quantité dépasse ce qui reste à retourner.';
      return;
    }
    const reason = values.reason.trim();
    if (!reason) {
      this.form.controls.reason.setValue('');
      this.error = 'Le motif du retour est obligatoire.';
      return;
    }
    this.ref.close({
      settlement: values.settlement,
      refundMethod: values.settlement === 'REFUND' ? values.refundMethod : undefined,
      reason,
      items
    });
  }
}
