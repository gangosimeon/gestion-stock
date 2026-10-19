import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, combineLatest, finalize, map, of, startWith, switchMap, take, tap } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { StockTransfer } from '../../../core/models/stock-transfer.model';
import { Warehouse } from '../../../core/models/warehouse.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { WarehousesApiService } from '../../../core/services/warehouses-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';
import { TransferReceiptDrawerComponent } from '../ui/transfer-receipt-drawer.component';

type TransferLineForm = FormGroup<{
  productId: FormControl<string>;
  quantity: FormControl<number>;
}>;

/**
 * Transfert de plusieurs produits du dépôt courant vers un autre dépôt (stock:transfer), saisi
 * comme un panier de vente. Le reçu (bon de transfert) s'ouvre dès l'enregistrement.
 */
@Component({
  selector: 'app-stock-transfer-page',
  standalone: true,
  imports: [
    SelectSearchComponent,
    CommonModule,
    AsyncPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTooltipModule,
    TransferReceiptDrawerComponent
  ],
  templateUrl: './stock-transfer-page.component.html',
  styleUrl: './stock-transfer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockTransferPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly warehouseCtx = inject(WarehouseContextService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('receiptDrawer') receiptDrawer!: MatDrawer;

  /** Interface seulement : le backend exige stock:transfer et l'accès au dépôt source. */
  readonly canTransfer$ = this.auth.hasPermission$('stock:transfer');

  isSubmitting = false;

  /** Transfert qui vient d'être enregistré : son reçu est affiché dans le volet. */
  readonly lastTransfer = signal<StockTransfer | null>(null);

  /** Catalogue du dépôt courant (stock disponible par produit). */
  private productsById = new Map<string, Product>();

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
    ),
    tap((vm) => (this.productsById = new Map(vm.products.map((p) => [p.id, p]))))
  );

  readonly form = this.fb.nonNullable.group({
    // Toujours le magasin courant (en-tête) : le backend refuse une autre source (WAREHOUSE_MISMATCH).
    fromWarehouseId: [{ value: this.warehouseCtx.warehouseId ?? '', disabled: true }],
    toWarehouseId: ['', [Validators.required]],
    note: ['', [Validators.maxLength(500)]],
    lines: this.fb.array<TransferLineForm>([])
  });

  /** Produit et quantité à ajouter à la liste (comme le panier d'une vente). */
  readonly picker = this.fb.nonNullable.group({
    productId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  get lines() {
    return this.form.controls.lines;
  }

  constructor() {
    // Le transfert part du magasin courant : il suit le magasin choisi dans l'en-tête ; la liste
    // (stock de l'ancien dépôt) est vidée.
    this.warehouseCtx.warehouseChanged$.pipe(takeUntilDestroyed()).subscribe((id) => {
      this.form.patchValue({ fromWarehouseId: id });
      this.lines.clear();
    });
  }

  /** Destinations possibles : les autres dépôts. */
  destinations(warehouses: Warehouse[]): Warehouse[] {
    const from = this.warehouseCtx.warehouseId;
    return warehouses.filter((w) => w.id !== from);
  }

  product(id: string): Product | undefined {
    return this.productsById.get(id);
  }

  /** Stock disponible au dépôt courant. */
  available(id: string): number {
    return this.productsById.get(id)?.stockQuantity ?? 0;
  }

  /** Ajoute le produit choisi ; déjà dans la liste, sa quantité est augmentée. */
  addLine(): void {
    if (this.picker.invalid) {
      this.picker.markAllAsTouched();
      return;
    }
    const { productId, quantity } = this.picker.getRawValue();
    const existing = this.lines.controls.find((l) => l.controls.productId.value === productId);
    if (existing) {
      existing.controls.quantity.setValue(existing.controls.quantity.value + quantity);
    } else {
      this.lines.push(
        this.fb.nonNullable.group({
          productId: [productId, [Validators.required]],
          quantity: [quantity, [Validators.required, Validators.min(1)]]
        })
      );
    }
    this.picker.reset({ productId: '', quantity: 1 });
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
  }

  totalQuantity(): number {
    return this.lines.controls.reduce((sum, l) => sum + (Number(l.controls.quantity.value) || 0), 0);
  }

  /** Quantité demandée supérieure au stock du dépôt courant (le serveur refuserait). */
  exceedsStock(line: TransferLineForm): boolean {
    return line.controls.quantity.value > this.available(line.controls.productId.value);
  }

  hasStockIssue(): boolean {
    return this.lines.controls.some((l) => this.exceedsStock(l));
  }

  submit(): void {
    if (this.lines.length === 0) {
      this.snackbar.open('Ajoutez au moins un produit à transférer', 'OK', { duration: 3000 });
      return;
    }
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
    this.picker.disable();

    this.warehousesApi
      .transfer({
        fromWarehouseId,
        toWarehouseId: raw.toWarehouseId,
        items: raw.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        note: raw.note.trim() || undefined
      })
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
          this.picker.enable();
          this.form.controls.fromWarehouseId.disable();
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (res) => {
          this.snackbar.open(
            `Transfert ${res.transfer.number} effectué : ${res.transfer.lines.length} produit(s), ${res.transfer.totalQuantity} unité(s).`,
            'OK',
            { duration: 3500 }
          );
          // Stock du dépôt courant mis à jour localement pour le transfert suivant.
          for (const line of res.transfer.lines) {
            const p = this.productsById.get(line.productId);
            if (p) this.productsById.set(p.id, { ...p, stockQuantity: p.stockQuantity - line.quantity });
          }
          this.lines.clear();
          this.form.patchValue({ note: '' });
          this.form.markAsUntouched();
          this.lastTransfer.set(res.transfer);
          void this.receiptDrawer.open();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 4000 })
      });
  }

  openLastReceipt(): void {
    if (this.lastTransfer()) void this.receiptDrawer.open();
  }

  closeReceipt(): void {
    void this.receiptDrawer.close();
  }
}
