import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, catchError, of, switchMap, take } from 'rxjs';

import { CustomerReturn } from '../../../core/models/customer-return.model';
import { Customer } from '../../../core/models/customer.model';
import { InvoiceSettings, defaultInvoiceSettings, settingsOf } from '../../../core/models/invoice-settings.model';
import { PaymentMethod, Sale } from '../../../core/models/sale.model';
import { AuthService } from '../../../core/services/auth.service';
import { CustomersApiService } from '../../../core/services/customers-api.service';
import { InvoiceSettingsStore } from '../../../core/services/invoice-settings-api.service';
import { QuotesApiService } from '../../../core/services/quotes-api.service';
import { QuoteReference } from '../../../core/models/quote.model';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { InvoiceData, saleToInvoiceData } from '../../../shared/invoice/invoice-data';
import { InvoiceDocumentComponent } from '../../../shared/invoice/invoice-document.component';
import { exportInvoicePdf, printInvoice } from '../../../shared/invoice/invoice-output';
import { withQuoteReference } from '../../../shared/invoice/quote-document';
import { paymentMethodLabels } from '../data/sales-vm.model';

/**
 * Facture d'une vente, mise en page selon la configuration de la facture (Paramètres). Les
 * montants sont ceux de la vente enregistrée ; la configuration ne change que la présentation,
 * y compris pour la réimpression d'une vente passée.
 */
@Component({
  selector: 'app-invoice-drawer',
  standalone: true,
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatProgressSpinnerModule, InvoiceDocumentComponent],
  templateUrl: './invoice-drawer.component.html',
  styleUrl: './invoice-drawer.component.scss'
})
export class InvoiceDrawerComponent implements OnChanges {
  @Input({ required: true }) sale!: Sale;
  @Input() customer: Customer | null = null;
  /** Retours enregistrés sur cette vente (historique) ; vide pour une vente qui vient d'être faite. */
  @Input() returns: CustomerReturn[] = [];
  /**
   * Devis dont la vente est la facture, s'il est connu de l'écran appelant (caisse, dès le
   * rattachement) ; sinon (undefined) il est demandé au serveur.
   */
  @Input() quote: QuoteReference | null | undefined = undefined;

  /** Nom du dépôt de la vente, s'il est connu de l'écran appelant (sinon : dépôt courant). */
  @Input() warehouseName: string | null | undefined = null;

  @Output() readonly close = new EventEmitter<void>();

  @ViewChild(InvoiceDocumentComponent) private document?: InvoiceDocumentComponent;

  private readonly store = inject(InvoiceSettingsStore);
  private readonly customers = inject(CustomersApiService);
  private readonly quotes = inject(QuotesApiService);
  private readonly auth = inject(AuthService);
  private readonly warehouseContext = inject(WarehouseContextService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings = signal<InvoiceSettings | null>(null);
  readonly logoUrl = signal<string | null>(null);
  /** La configuration n'a pas pu être lue : présentation par défaut, sans coordonnées. */
  readonly settingsUnavailable = signal(false);
  readonly data = signal<InvoiceData | null>(null);
  readonly busy = signal<'print' | 'pdf' | null>(null);

  private customerPhone: string | null = null;
  /** Devis dont la vente est la facture : objet, lot… repris sur la facture définitive. */
  private quoteReference: QuoteReference | null = null;
  private quoteSaleId: string | null = null;

  constructor() {
    this.store
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ settings, logoUrl }) => {
          this.settings.set(settingsOf(settings));
          this.logoUrl.set(logoUrl);
        },
        error: () => {
          this.settings.set(defaultInvoiceSettings());
          this.settingsUnavailable.set(true);
        }
      });
  }

  ngOnChanges(): void {
    this.customerPhone = this.customer?.phone ?? null;
    this.refreshData();
    this.loadCustomerPhone();
    this.loadQuoteReference();
  }

  requestClose(): void {
    this.close.emit();
  }

  async print(): Promise<void> {
    const root = this.document?.root();
    const settings = this.settings();
    if (!root || !settings || this.busy()) return;
    this.busy.set('print');
    try {
      await printInvoice(root, settings.appearance, `Facture ${this.data()?.number ?? ''}`);
    } catch (e) {
      this.snackbar.open(e instanceof Error ? e.message : 'Impression impossible.', 'OK', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  async exportPdf(): Promise<void> {
    const root = this.document?.root();
    const settings = this.settings();
    if (!root || !settings || this.busy()) return;
    this.busy.set('pdf');
    try {
      await exportInvoicePdf(root, settings.appearance, `facture_${this.sale.number ?? this.sale.id}.pdf`);
    } catch {
      this.snackbar.open('Export PDF impossible : réessayez.', 'OK', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  methodLabel(method: PaymentMethod): string {
    return paymentMethodLabels[method] ?? method;
  }

  private refreshData(): void {
    if (!this.sale) return;
    const sameWarehouse = !!this.sale.warehouseId && this.sale.warehouseId === this.warehouseContext.warehouseId;
    this.data.set(withQuoteReference(
      saleToInvoiceData(this.sale, {
        customerName: this.customer?.name ?? null,
        customerPhone: this.customerPhone,
        warehouseName: this.warehouseName ?? (sameWarehouse ? this.warehouseContext.warehouseName : null),
        paymentMethodLabel: this.methodLabel(this.sale.paymentMethod),
        returns: this.returns
      }),
      this.quoteReference
    ));
  }

  /** Vente issue d'un devis : ses informations renseignées (objet, lot, conditions…) figurent sur la facture. */
  private loadQuoteReference(): void {
    if (this.quote) {
      // Rattachement confirmé par l'écran appelant : facture définitive sans attendre le serveur.
      this.quoteReference = this.quote;
      this.quoteSaleId = this.sale?.id ?? null;
      this.refreshData();
      return;
    }
    const saleId = this.sale?.id;
    if (!saleId || saleId === this.quoteSaleId) return;
    this.quoteSaleId = saleId;
    this.quoteReference = null;
    this.quotes
      .forSale(saleId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((quote) => {
        if (quote && this.sale?.id === saleId) {
          this.quoteReference = quote;
          this.refreshData();
        }
      });
  }

  /** Téléphone du client (historique) : lu seulement si l'utilisateur consulte les clients. */
  private loadCustomerPhone(): void {
    const customerId = this.sale?.customerId;
    if (!customerId || this.customer) return;
    this.auth
      .hasPermission$('customer:read')
      .pipe(
        take(1),
        switchMap((allowed) => (allowed ? this.customers.getById(customerId) : EMPTY)),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((customer) => {
        if (customer?.phone && this.sale?.customerId === customerId) {
          this.customerPhone = customer.phone;
          this.refreshData();
        }
      });
  }
}
