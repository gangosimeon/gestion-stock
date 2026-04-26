import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type PaySupplierDialogData = {
  title: string;
  maxAmount?: number;
};

export type PaySupplierDialogResult = {
  amount: number;
  paymentDateIso: string;
  note?: string;
};

@Component({
  selector: 'app-pay-supplier-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './pay-supplier-dialog.component.html'
})
export class PaySupplierDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<PaySupplierDialogComponent>);
  readonly data = inject<PaySupplierDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentDateIso: [new Date().toISOString().slice(0, 10), [Validators.required]],
    note: ['']
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (this.data.maxAmount && raw.amount > this.data.maxAmount) {
      this.form.controls.amount.setErrors({ max: true });
      return;
    }

    this.ref.close({
      amount: Number(raw.amount),
      paymentDateIso: raw.paymentDateIso,
      note: raw.note.trim() ? raw.note.trim() : undefined
    } satisfies PaySupplierDialogResult);
  }
}
