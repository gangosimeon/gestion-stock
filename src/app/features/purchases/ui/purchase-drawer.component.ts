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
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { Supplier } from '../../../core/models/supplier.model';
import { CreatePurchaseOrderRequest } from '../../../core/services/purchases-api.service';
import { PurchasesFacade } from '../data/purchases.facade';
import { PurchaseDrawerMode } from '../data/purchases-vm.model';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

export interface PurchaseDrawerContext {
  mode: PurchaseDrawerMode;
  orderId: string | null;
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  /** purchase:receive (interface seulement). */
  canReceive: boolean;
  /** purchase:pay : facture fournisseur (interface seulement). */
  canPay: boolean;
}

type LineForm = {
  productId: string;
  quantity: number;
  unitPurchasePrice: number;
  // Commande enregistrée : libellés et quantités reçues fournis par le backend.
  productSku?: string;
  productName?: string;
  receivedQuantity?: number;
  lineTotal?: number;
};

@Component({
  selector: 'app-purchase-drawer',
  standalone: true,
  imports: [
    SelectSearchComponent,
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatSnackBarModule
  ],
  templateUrl: './purchase-drawer.component.html',
  styleUrl: './purchase-drawer.component.scss'
})
export class PurchaseDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(PurchasesFacade);
  private readonly snackbar = inject(MatSnackBar);

  @Input({ required: true }) ctx!: PurchaseDrawerContext;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  isSubmitting = false;
  isReceiving = false;
  isInvoicing = false;
  loadedOrder: PurchaseOrder | null = null;

  readonly displayedColumns = ['product', 'qty', 'price', 'total', 'remove'] as const;

  readonly form = this.fb.nonNullable.group({
    supplierId: ['', [Validators.required]],
    lineProductId: [''],
    lineQuantity: [1, [Validators.required, Validators.min(1)]],
    lineUnitPurchasePrice: [0, [Validators.required, Validators.min(0)]],
    lines: [[] as LineForm[]],
    invoiceNumber: [''],
    invoiceDateIso: [new Date().toISOString().slice(0, 10)]
  });

  ngOnChanges(): void {
    this.loadedOrder = null;

    if (this.ctx.mode === 'CREATE') {
      this.form.reset(
        {
          supplierId: this.ctx.suppliers[0]?.id ?? '',
          lineProductId: this.ctx.products[0]?.id ?? '',
          lineQuantity: 1,
          lineUnitPurchasePrice: this.ctx.products[0]?.purchasePrice ?? 0,
          lines: [],
          invoiceNumber: '',
          invoiceDateIso: new Date().toISOString().slice(0, 10)
        },
        { emitEvent: false }
      );

      this.form.enable({ emitEvent: false });
      return;
    }

    const o = this.ctx.orders.find((x) => x.id === this.ctx.orderId) ?? null;
    this.loadedOrder = o;

    if (!o) return;

    this.form.reset(
      {
        supplierId: o.supplierId,
        lineProductId: this.ctx.products[0]?.id ?? '',
        lineQuantity: 1,
        lineUnitPurchasePrice: this.ctx.products[0]?.purchasePrice ?? 0,
        lines: o.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPurchasePrice: l.unitPurchasePrice,
          productSku: l.productSku,
          productName: l.productName,
          receivedQuantity: l.receivedQuantity,
          lineTotal: l.lineTotal
        })),
        invoiceNumber: o.invoice?.invoiceNumber ?? '',
        invoiceDateIso: (o.invoice?.invoiceDateIso ?? new Date().toISOString()).slice(0, 10)
      },
      { emitEvent: false }
    );

    this.form.disable({ emitEvent: false });
    // Seule la facture reste saisissable, et seulement quand le backend l'accepte.
    if (this.canInvoice) {
      this.form.controls.invoiceNumber.enable({ emitEvent: false });
      this.form.controls.invoiceDateIso.enable({ emitEvent: false });
    }
  }

  /** Facture saisissable : commande reçue ou soldée, sans facture, permission purchase:pay. */
  get canInvoice(): boolean {
    const o = this.loadedOrder;
    return (
      !!o &&
      this.ctx.canPay &&
      !o.invoice &&
      (o.documentStatus === 'RECEIVED' || o.documentStatus === 'CLOSED')
    );
  }

  /** Date maximale de facture (le backend refuse une date future). */
  readonly today = new Date().toISOString().slice(0, 10);

  get title(): string {
    return this.ctx.mode === 'CREATE' ? 'Nouvelle commande fournisseur' : 'Détail commande';
  }

  get lines(): LineForm[] {
    return this.form.controls.lines.value;
  }

  productName(l: LineForm): string {
    return l.productName ?? this.ctx.products.find((p) => p.id === l.productId)?.name ?? '—';
  }

  productSku(l: LineForm): string {
    return l.productSku ?? this.ctx.products.find((p) => p.id === l.productId)?.sku ?? '';
  }

  supplierName(id: string): string {
    return this.ctx.suppliers.find((s) => s.id === id)?.name ?? '—';
  }

  /** Commande enregistrée : total de ligne du backend ; saisie : estimation. */
  lineTotal(l: LineForm): number {
    return l.lineTotal ?? (Number(l.quantity) || 0) * (Number(l.unitPurchasePrice) || 0);
  }

  /**
   * Commande enregistrée : total calculé par le backend. Saisie : simple estimation, le backend
   * recalcule le total à l'enregistrement.
   */
  totalAmount(): number {
    if (this.loadedOrder) return this.loadedOrder.totalAmount;
    return this.lines.reduce((acc, l) => acc + this.lineTotal(l), 0);
  }

  onProductChange(): void {
    const id = this.form.controls.lineProductId.value;
    const p = this.ctx.products.find((x) => x.id === id);
    if (!p) return;
    this.form.controls.lineUnitPurchasePrice.setValue(p.purchasePrice, { emitEvent: false });
  }

  addLine(): void {
    const productId = this.form.controls.lineProductId.value;
    if (!productId) return;

    const quantity = this.form.controls.lineQuantity.value;
    const unitPurchasePrice = this.form.controls.lineUnitPurchasePrice.value;

    if (quantity <= 0 || unitPurchasePrice < 0) return;

    const current = this.lines;
    const existingIdx = current.findIndex((l) => l.productId === productId);

    if (existingIdx >= 0) {
      const updated = current.map((l, idx) =>
        idx === existingIdx
          ? {
              ...l,
              quantity: l.quantity + quantity,
              unitPurchasePrice
            }
          : l
      );
      this.form.controls.lines.setValue(updated);
      return;
    }

    this.form.controls.lines.setValue([...current, { productId, quantity, unitPurchasePrice }]);
  }

  removeLine(productId: string): void {
    this.form.controls.lines.setValue(this.lines.filter((l) => l.productId !== productId));
  }

  submit(): void {
    if (this.ctx.mode !== 'CREATE') return;

    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.lines.length === 0) {
      this.snackbar.open('Ajoute au moins un produit', 'OK', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    const raw = this.form.getRawValue();

    const payload: CreatePurchaseOrderRequest = {
      supplierId: raw.supplierId,
      lines: raw.lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitPurchasePrice: Number(l.unitPurchasePrice)
      }))
    };

    (this.facade.createOrder(payload) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Commande créée', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  receive(): void {
    if (this.ctx.mode !== 'DETAIL') return;
    if (!this.loadedOrder) return;
    if (this.loadedOrder.status !== 'PENDING' || !this.ctx.canReceive) return;
    if (this.isReceiving) return;

    this.isReceiving = true;

    (this.facade.receive(this.loadedOrder.id) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isReceiving = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Réception validée', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  createInvoice(): void {
    if (this.ctx.mode !== 'DETAIL') return;
    if (!this.loadedOrder || !this.canInvoice) return;
    if (this.isInvoicing) return;

    const invoiceNumber = this.form.controls.invoiceNumber.value.trim();
    const invoiceDateIso = this.form.controls.invoiceDateIso.value.trim();

    if (!invoiceNumber) {
      this.snackbar.open('Numéro facture requis', 'OK', { duration: 3000 });
      return;
    }
    if (!invoiceDateIso) {
      this.snackbar.open('Date facture requise', 'OK', { duration: 3000 });
      return;
    }

    this.isInvoicing = true;

    (this.facade.createInvoice(this.loadedOrder.id, { invoiceNumber, invoiceDateIso }) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isInvoicing = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Facture enregistrée', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  requestClose(): void {
    this.close.emit();
  }
}
