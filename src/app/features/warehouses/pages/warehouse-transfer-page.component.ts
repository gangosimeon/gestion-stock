import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, combineLatest, finalize, map, of, startWith, switchMap, take } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { Warehouse } from '../../../core/models/warehouse.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { WarehousesApiService } from '../../../core/services/warehouses-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

@Component({
  selector: 'app-warehouse-transfer-page',
  standalone: true,
  imports: [
    SelectSearchComponent,
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
  private readonly auth = inject(AuthService);
  private readonly warehouseCtx = inject(WarehouseContextService);

  /** Interface seulement : le backend exige stock:transfer et l'accès au dépôt source. */
  readonly canTransfer$ = this.auth.hasPermission$('stock:transfer');

  isSubmitting = false;

  // Dépôts et catalogue du backend : identifiants réels, comme le transfert. Le catalogue porte le
  // stock du dépôt courant : rechargé quand on change de dépôt.
  readonly vm$ = this.warehouseCtx.warehouseChanged$.pipe(
    startWith(null),
    switchMap(() =>
      combineLatest([this.warehousesApi.list(), this.productsApi.list()]).pipe(
        map(([w, p]) => ({
          warehouses: w.items,
          products: p.items,
          isLoading: false,
          errorMessage: null as string | null
        })),
        catchError((e: unknown) =>
          of({
            warehouses: [] as Warehouse[],
            products: [] as Product[],
            isLoading: false,
            errorMessage: e instanceof Error ? e.message : 'Erreur de chargement'
          })
        ),
        startWith({ warehouses: [] as Warehouse[], products: [] as Product[], isLoading: true, errorMessage: null as string | null })
      )
    )
  );

  readonly form = this.fb.nonNullable.group({
    // Toujours le magasin courant (en-tête) : le backend refuse une autre source (WAREHOUSE_MISMATCH).
    fromWarehouseId: [{ value: this.warehouseCtx.warehouseId ?? '', disabled: true }],
    toWarehouseId: ['', [Validators.required]],
    productId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    // Le transfert part du magasin courant : il suit le magasin choisi dans l'en-tête.
    this.warehouseCtx.warehouseChanged$
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.form.patchValue({ fromWarehouseId: id, productId: '' }));
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const fromWarehouseId = this.warehouseCtx.warehouseId ?? raw.fromWarehouseId;

    if (!fromWarehouseId) {
      this.snackbar.open('Choisis d’abord le magasin courant dans l’en-tête', 'OK', { duration: 3000 });
      return;
    }
    if (fromWarehouseId === raw.toWarehouseId) {
      this.snackbar.open('Choisis deux magasins différents', 'OK', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    this.warehousesApi
      .transfer({
        fromWarehouseId,
        toWarehouseId: raw.toWarehouseId,
        productId: raw.productId,
        quantity: raw.quantity
      })
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
          this.form.controls.fromWarehouseId.disable();
        })
      )
      .subscribe({
        next: (res) =>
          this.snackbar.open(
            `Transfert effectué. Stock restant au dépôt source : ${res.out.balanceAfter ?? '—'}`,
            'OK',
            { duration: 3500 }
          ),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
