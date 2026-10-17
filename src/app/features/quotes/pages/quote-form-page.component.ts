import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, map, of, startWith } from 'rxjs';

import { toMessage } from '../../../core/interceptors/api-error.interceptor';
import { Customer } from '../../../core/models/customer.model';
import { InvoiceSettings, defaultInvoiceSettings, settingsOf } from '../../../core/models/invoice-settings.model';
import { Product } from '../../../core/models/product.model';
import { Quote, QuoteRequest, isQuoteEditable } from '../../../core/models/quote.model';
import { InvoiceSettingsStore } from '../../../core/services/invoice-settings-api.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { QuotesApiService } from '../../../core/services/quotes-api.service';
import { SalesApiService } from '../../../core/services/sales-api.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { InvoiceDocumentComponent } from '../../../shared/invoice/invoice-document.component';
import { quoteToDocumentData } from '../../../shared/invoice/quote-document';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

type LineGroup = FormGroup<{
  productId: FormControl<string>;
  productSku: FormControl<string>;
  productName: FormControl<string>;
  quantity: FormControl<number>;
  /** Quantité pour un bénéficiaire (facultative) : la quantité totale en découle. */
  quantityPerBeneficiary: FormControl<number | null>;
  unitPrice: FormControl<number>;
}>;

type LineValue = ReturnType<LineGroup['getRawValue']>;

/**
 * Quantité totale d'une ligne (même règle que le serveur) : quantité par bénéficiaire × nombre de
 * bénéficiaires si elle est renseignée, sinon quantité saisie.
 */
export function totalQuantity(
  line: Pick<LineValue, 'quantity' | 'quantityPerBeneficiary'>,
  beneficiaries: number | null
): number {
  const perBeneficiary = Number(line.quantityPerBeneficiary) || 0;
  if (perBeneficiary > 0) return perBeneficiary * (Number(beneficiaries) || 0);
  return Number(line.quantity) || 0;
}

/** Jour local `AAAA-MM-JJ`. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Texte facultatif : null s'il est vide (jamais de chaîne vide envoyée). */
function optional(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  return text ? text : null;
}

/**
 * Création et modification d'un devis : client et produits du catalogue existant, prix
 * unitaire prérempli avec le tarif du produit (modifiable pour ce devis), informations
 * facultatives, aperçu en direct. Le total affiché est une estimation : le serveur recalcule
 * chaque ligne à l'enregistrement.
 */
@Component({
  selector: 'app-quote-form-page',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DatePickerDirective,
    InvoiceDocumentComponent,
    SelectSearchComponent
  ],
  templateUrl: './quote-form-page.component.html',
  styleUrl: './quote-form-page.component.scss'
})
export class QuoteFormPageComponent implements OnInit {
  private readonly api = inject(QuotesApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly salesApi = inject(SalesApiService);
  private readonly settingsStore = inject(InvoiceSettingsStore);
  private readonly warehouseCtx = inject(WarehouseContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    customerId: new FormControl<string | null>(null, Validators.required),
    quoteDate: new FormControl<string>(today(), { nonNullable: true, validators: Validators.required }),
    validUntil: new FormControl<string | null>(null),
    subject: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(500) }),
    lotReference: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(100) }),
    beneficiaries: new FormControl<number | null>(null, [Validators.min(1), Validators.max(1_000_000)]),
    deliveryAddress: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(500) }),
    contractReference: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(150) }),
    deliveryTerms: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(1000) }),
    paymentTerms: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(1000) }),
    executionDelay: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(200) }),
    notes: new FormControl<string>('', { nonNullable: true, validators: Validators.maxLength(2000) }),
    lines: new FormArray<LineGroup>([])
  });

  /** Un devis ne crée jamais de produit : il se choisit dans le catalogue existant. */
  readonly productHint =
    'Produit absent de la liste ? Ajoutez-le d’abord au catalogue (menu Produits) : un devis ne crée jamais de produit.';

  /** Sélecteur « Ajouter un produit » : remis à vide après chaque ajout. */
  readonly productPicker = new FormControl<string | null>(null);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly quote = signal<Quote | null>(null);
  readonly customers = signal<Customer[]>([]);
  readonly products = signal<Product[]>([]);
  readonly settings = signal<InvoiceSettings>(defaultInvoiceSettings());
  readonly logoUrl = signal<string | null>(null);

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null), map(() => this.form.getRawValue())), {
    requireSync: true
  });

  readonly isEdit = computed(() => this.quote() !== null);

  /** Produits du catalogue pas encore dans le devis (un produit = une ligne). */
  readonly availableProducts = computed(() => {
    const used = new Set(this.formValue().lines.map((l) => l.productId));
    return this.products().filter((p) => !used.has(p.id));
  });

  /** Estimation à l'écran ; le serveur recalcule chaque ligne à l'enregistrement. */
  readonly estimatedTotal = computed(() => {
    const v = this.formValue();
    return v.lines.reduce((sum, l) => sum + totalQuantity(l, v.beneficiaries) * (Number(l.unitPrice) || 0), 0);
  });

  /** Lignes chiffrées par bénéficiaire alors que le nombre de bénéficiaires n'est pas renseigné. */
  readonly missingBeneficiaries = computed(() => {
    const v = this.formValue();
    return !(Number(v.beneficiaries) > 0) && v.lines.some((l) => (Number(l.quantityPerBeneficiary) || 0) > 0);
  });

  /** Aperçu du document avec la configuration de la facture : seuls les champs renseignés apparaissent. */
  readonly preview = computed(() => {
    const v = this.formValue();
    const customer = this.customers().find((c) => c.id === v.customerId);
    return quoteToDocumentData({
      number: this.quote()?.number ?? 'Nouveau devis',
      quoteDate: v.quoteDate || today(),
      validUntil: v.validUntil || null,
      customerName: customer?.name ?? 'Client / organisme commanditaire à choisir',
      customerPhone: customer?.phone ?? null,
      warehouseName: this.warehouseCtx.warehouseName,
      subject: v.subject,
      lotReference: v.lotReference,
      beneficiaries: v.beneficiaries,
      deliveryAddress: v.deliveryAddress,
      contractReference: v.contractReference,
      deliveryTerms: v.deliveryTerms,
      paymentTerms: v.paymentTerms,
      executionDelay: v.executionDelay,
      notes: v.notes,
      lines: v.lines
        .filter((l) => totalQuantity(l, v.beneficiaries) > 0)
        .map((l) => ({
          productSku: l.productSku,
          productName: l.productName,
          quantity: totalQuantity(l, v.beneficiaries),
          quantityPerBeneficiary: Number(l.quantityPerBeneficiary) > 0 ? Number(l.quantityPerBeneficiary) : null,
          unitPrice: Number(l.unitPrice) || 0
        }))
    });
  });

  get lines(): FormArray<LineGroup> {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    this.settingsStore
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ settings, logoUrl }) => {
          this.settings.set(settingsOf(settings));
          this.logoUrl.set(logoUrl);
        },
        // Configuration indisponible : aperçu sans les informations de l'entreprise.
        error: () => undefined
      });
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      customers: this.salesApi.listCustomers(),
      products: this.productsApi.list(),
      quote: id ? this.api.get(id) : of(null)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ customers, products, quote }) => {
          this.customers.set(customers.items.filter((c) => c.active !== false || c.id === quote?.customerId));
          this.products.set(products.items.filter((p) => p.active !== false));
          if (quote) {
            if (!isQuoteEditable(quote)) {
              this.loadError.set(`Le devis ${quote.number} ne peut plus être modifié.`);
            }
            this.quote.set(quote);
            this.fill(quote);
          }
          this.loading.set(false);
        },
        error: (e: unknown) => {
          this.loading.set(false);
          this.loadError.set(e instanceof HttpErrorResponse ? toMessage(e) : 'Chargement impossible.');
        }
      });
  }

  /** Ajoute le produit choisi : prix prérempli avec son tarif (gros ou détail selon le client). */
  addProduct(productId: string | null): void {
    const product = this.products().find((p) => p.id === productId);
    this.productPicker.setValue(null, { emitEvent: false });
    if (!product) return;
    const customer = this.customers().find((c) => c.id === this.form.controls.customerId.value);
    const price = customer?.priceCategory === 'WHOLESALE' ? product.wholesalePrice : product.retailPrice;
    this.lines.push(this.line(product.id, product.sku, product.name, 1, null, Number(price) || 0));
    this.lines.markAsDirty();
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
    this.lines.markAsDirty();
  }

  /** Quantité totale de la ligne (calculée si elle est chiffrée par bénéficiaire). */
  lineQuantity(index: number): number {
    return totalQuantity(this.lines.at(index).getRawValue(), this.form.controls.beneficiaries.value);
  }

  /** La ligne est chiffrée par bénéficiaire : sa quantité totale n'est pas saisie. */
  isPerBeneficiary(index: number): boolean {
    return (Number(this.lines.at(index).controls.quantityPerBeneficiary.value) || 0) > 0;
  }

  lineTotal(index: number): number {
    return this.lineQuantity(index) * (Number(this.lines.at(index).controls.unitPrice.value) || 0);
  }

  async save(): Promise<void> {
    if (this.saving()) return; // pas de double envoi
    this.saveError.set(null);
    if (this.lines.length === 0) {
      this.saveError.set('Ajoutez au moins un produit du catalogue.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError.set('Certains champs sont invalides : corrigez-les avant d’enregistrer.');
      return;
    }
    const v = this.form.getRawValue();
    if (this.missingBeneficiaries()) {
      this.saveError.set('Renseignez le nombre de bénéficiaires : des lignes sont chiffrées par bénéficiaire.');
      return;
    }
    if (v.lines.some((l) => totalQuantity(l, v.beneficiaries) > 100_000)) {
      this.saveError.set('Une quantité totale dépasse 100 000 : réduisez la quantité par bénéficiaire.');
      return;
    }
    if (v.validUntil && v.validUntil < v.quoteDate) {
      this.saveError.set('La date de validité ne peut pas précéder la date du devis.');
      return;
    }
    const request: QuoteRequest = {
      customerId: v.customerId!,
      quoteDate: v.quoteDate,
      validUntil: v.validUntil || null,
      subject: optional(v.subject),
      lotReference: optional(v.lotReference),
      beneficiaries: v.beneficiaries && v.beneficiaries > 0 ? v.beneficiaries : null,
      deliveryAddress: optional(v.deliveryAddress),
      contractReference: optional(v.contractReference),
      deliveryTerms: optional(v.deliveryTerms),
      paymentTerms: optional(v.paymentTerms),
      executionDelay: optional(v.executionDelay),
      notes: optional(v.notes),
      // Par bénéficiaire : le serveur calcule la quantité totale (× nombre de bénéficiaires).
      lines: v.lines.map((l) => {
        const perBeneficiary = Number(l.quantityPerBeneficiary) > 0 ? Number(l.quantityPerBeneficiary) : null;
        return {
          productId: l.productId,
          quantity: perBeneficiary ? null : Number(l.quantity),
          quantityPerBeneficiary: perBeneficiary,
          unitPrice: Number(l.unitPrice)
        };
      })
    };

    this.saving.set(true);
    try {
      const current = this.quote();
      const saved = await firstValueFrom(current ? this.api.update(current.id, request) : this.api.create(request));
      this.form.markAsPristine();
      this.snackbar.open(current ? `Devis ${saved.number} enregistré.` : `Devis ${saved.number} créé.`, 'OK', {
        duration: 3000
      });
      void this.router.navigate(['/quotes', saved.id]);
    } catch (e) {
      this.saveError.set(e instanceof HttpErrorResponse ? toMessage(e) : 'Enregistrement impossible.');
    } finally {
      this.saving.set(false);
    }
  }

  lineError(index: number, field: 'quantity' | 'quantityPerBeneficiary' | 'unitPrice'): string | null {
    const control = this.lines.at(index).controls[field];
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    return field === 'unitPrice' ? 'Prix unitaire positif requis.' : 'Entre 1 et 100 000.';
  }

  private fill(quote: Quote): void {
    this.form.patchValue({
      customerId: quote.customerId,
      quoteDate: quote.quoteDate,
      validUntil: quote.validUntil,
      subject: quote.subject ?? '',
      lotReference: quote.lotReference ?? '',
      beneficiaries: quote.beneficiaries,
      deliveryAddress: quote.deliveryAddress ?? '',
      contractReference: quote.contractReference ?? '',
      deliveryTerms: quote.deliveryTerms ?? '',
      paymentTerms: quote.paymentTerms ?? '',
      executionDelay: quote.executionDelay ?? '',
      notes: quote.notes ?? ''
    });
    this.lines.clear();
    for (const l of quote.lines) {
      this.lines.push(
        this.line(l.productId, l.productSku, l.productName, l.quantity, l.quantityPerBeneficiary, Number(l.unitPrice))
      );
    }
    this.form.markAsPristine();
  }

  private line(
    productId: string,
    sku: string,
    name: string,
    quantity: number,
    quantityPerBeneficiary: number | null,
    unitPrice: number
  ): LineGroup {
    return new FormGroup({
      productId: new FormControl(productId, { nonNullable: true }),
      productSku: new FormControl(sku, { nonNullable: true }),
      productName: new FormControl(name, { nonNullable: true }),
      quantity: new FormControl(quantity, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1), Validators.max(100_000)]
      }),
      quantityPerBeneficiary: new FormControl<number | null>(quantityPerBeneficiary, [
        Validators.min(1),
        Validators.max(100_000)
      ]),
      unitPrice: new FormControl(unitPrice, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0.01), Validators.max(999_999_999.99)]
      })
    });
  }
}
