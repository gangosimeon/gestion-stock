import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { SupplierPaymentMethod } from '../../../core/models/supplier-payment.model';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

export type PaySupplierDialogData = {
  title: string;
  /** Reste à payer calculé par le backend (aide à la saisie ; le backend refuse au-delà). */
  maxAmount?: number;
};

export type PaySupplierDialogResult = {
  amount: number;
  paymentDateIso: string;
  paymentMethod: SupplierPaymentMethod;
  externalReference?: string;
  note?: string;
};

@Component({
  selector: 'app-pay-supplier-dialog',
  standalone: true,
  imports: [
    SelectSearchComponent,MatDialogModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './pay-supplier-dialog.component.html'
})
export class PaySupplierDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<PaySupplierDialogComponent>);
  readonly data = inject<PaySupplierDialogData>(MAT_DIALOG_DATA);

  /** Pas de paiement daté dans le futur (règle backend). */
  readonly today = new Date().toISOString().slice(0, 10);

  readonly methods: { value: SupplierPaymentMethod; label: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Virement' },
    { value: 'MOBILE_MONEY', label: 'Mobile money' },
    { value: 'CASH', label: 'Espèces (sort de ma caisse ouverte)' }
  ];

  readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentDateIso: [this.today, [Validators.required]],
    paymentMethod: ['BANK_TRANSFER' as SupplierPaymentMethod, [Validators.required]],
    externalReference: ['', [Validators.maxLength(50)]],
    note: ['', [Validators.maxLength(500)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (this.data.maxAmount !== undefined && raw.amount > this.data.maxAmount) {
      this.form.controls.amount.setErrors({ max: true });
      return;
    }

    this.ref.close({
      amount: Number(raw.amount),
      paymentDateIso: raw.paymentDateIso,
      paymentMethod: raw.paymentMethod,
      externalReference: raw.externalReference.trim() ? raw.externalReference.trim() : undefined,
      note: raw.note.trim() ? raw.note.trim() : undefined
    } satisfies PaySupplierDialogResult);
  }
}
