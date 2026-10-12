import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { PaymentMethod } from '../../../core/models/sale.model';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

export type PayCustomerDialogData = {
  title: string;
  /** Dette calculée par le backend (aide à la saisie ; le backend refuse au-delà). */
  maxAmount?: number;
};

export type PayCustomerDialogResult = {
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
};

@Component({
  selector: 'app-pay-customer-dialog',
  standalone: true,
  imports: [
    SelectSearchComponent,MatDialogModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './pay-customer-dialog.component.html'
})
export class PayCustomerDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<PayCustomerDialogComponent>);
  readonly data = inject<PayCustomerDialogData>(MAT_DIALOG_DATA);

  // Tout règlement est encaissé dans ma caisse ouverte (le mode sert au rapprochement).
  readonly methods: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: 'Espèces' },
    { value: 'MOBILE_MONEY', label: 'Mobile money' },
    { value: 'BANK_TRANSFER', label: 'Virement' }
  ];

  readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['CASH' as PaymentMethod, [Validators.required]],
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
      paymentMethod: raw.paymentMethod,
      note: raw.note.trim() ? raw.note.trim() : undefined
    } satisfies PayCustomerDialogResult);
  }
}
