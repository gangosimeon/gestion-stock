import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { combineLatest, finalize, map, startWith, take } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { Warehouse } from '../../../core/models/warehouse.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { WarehousesApiService } from '../../../core/services/warehouses-api.service';

@Component({
  selector: 'app-warehouse-transfer-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './warehouse-transfer-page.component.html',
  styleUrl: './warehouse-transfer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WarehouseTransferPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly snackbar = inject(MatSnackBar);

  isSubmitting = false;

  readonly vm$ = combineLatest([this.warehousesApi.list(), this.productsApi.list()]).pipe(
    map(([w, p]) => ({ warehouses: w.items, products: p.items, isLoading: false, errorMessage: null })),
    startWith({ warehouses: [] as Warehouse[], products: [] as Product[], isLoading: true, errorMessage: null })
  );

  readonly form = this.fb.nonNullable.group({
    fromWarehouseId: ['', [Validators.required]],
    toWarehouseId: ['', [Validators.required]],
    productId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (raw.fromWarehouseId === raw.toWarehouseId) {
      this.snackbar.open('Choisis deux magasins différents', 'OK', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    this.warehousesApi
      .transfer({
        fromWarehouseId: raw.fromWarehouseId,
        toWarehouseId: raw.toWarehouseId,
        productId: raw.productId,
        quantity: raw.quantity
      })
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => this.snackbar.open('Transfert effectué', 'OK', { duration: 2500 }),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
