import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { StockMovementReason } from '../../../core/models/stock-movement.model';
import { CreateStockMovementRequest } from '../../../core/services/stock-api.service';
import { StockFacade } from '../data/stock.facade';
import { stockReasonLabels } from '../data/stock-vm.model';

export interface StockMovementDrawerContext {
  products: Product[];
}

@Component({
  selector: 'app-stock-movement-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './stock-movement-drawer.component.html',
  styleUrl: './stock-movement-drawer.component.scss'
})
export class StockMovementDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(StockFacade);
  private readonly snackbar = inject(MatSnackBar);

  @Input({ required: true }) ctx!: StockMovementDrawerContext;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  isSubmitting = false;

  /** Le backend contrôle le sens : SUPPLY > 0, SALE et LOSS < 0, ADJUSTMENT dans les deux sens. */
  readonly reasons: { key: string; value: StockMovementReason; label: string; sign: 1 | -1 }[] = [
    { key: 'SUPPLY', value: 'SUPPLY', label: stockReasonLabels.SUPPLY, sign: 1 },
    { key: 'SALE', value: 'SALE', label: stockReasonLabels.SALE, sign: -1 },
    { key: 'LOSS', value: 'LOSS', label: stockReasonLabels.LOSS, sign: -1 },
    { key: 'ADJUSTMENT_IN', value: 'ADJUSTMENT', label: `${stockReasonLabels.ADJUSTMENT} (+)`, sign: 1 },
    { key: 'ADJUSTMENT_OUT', value: 'ADJUSTMENT', label: `${stockReasonLabels.ADJUSTMENT} (−)`, sign: -1 }
  ];

  readonly form = this.fb.nonNullable.group({
    productId: ['', [Validators.required]],
    reason: ['SUPPLY', [Validators.required]],
    quantityAbs: [1, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const choice = this.reasons.find((r) => r.key === raw.reason) ?? this.reasons[0];
    const sign = choice.sign;

    const payload: CreateStockMovementRequest = {
      productId: raw.productId,
      reason: choice.value,
      quantity: sign * raw.quantityAbs,
      note: raw.note || undefined
    };

    this.isSubmitting = true;
    this.form.disable();

    this.facade
      .createMovement(payload)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Mouvement enregistré', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => {
          this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 });
        }
      });
  }

  requestClose(): void {
    this.close.emit();
  }

  fieldError(path: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[path];
    if (!c.touched || !c.errors) return null;

    if (c.errors['required']) return 'Champ obligatoire';
    if (c.errors['min']) return 'Valeur invalide';

    return 'Invalide';
  }
}
