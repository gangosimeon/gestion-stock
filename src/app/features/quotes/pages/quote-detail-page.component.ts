import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import { toMessage } from '../../../core/interceptors/api-error.interceptor';
import { InvoiceSettings, defaultInvoiceSettings, settingsOf } from '../../../core/models/invoice-settings.model';
import { Quote, isQuoteEditable, isQuoteInvoiceable, quoteStatusLabels } from '../../../core/models/quote.model';
import { Sale } from '../../../core/models/sale.model';
import { InvoiceSettingsStore } from '../../../core/services/invoice-settings-api.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { QuotesApiService } from '../../../core/services/quotes-api.service';
import { SalesApiService } from '../../../core/services/sales-api.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { confirmWith } from '../../../shared/dialog/confirm-dialog.component';
import { InvoiceDocumentComponent } from '../../../shared/invoice/invoice-document.component';
import { exportInvoicePdf, printInvoice } from '../../../shared/invoice/invoice-output';
import { quoteToDocumentData } from '../../../shared/invoice/quote-document';
import { InvoiceDrawerComponent } from '../../sales/ui/invoice-drawer.component';
import { quoteBadge } from './quotes-list-page.component';

/**
 * Devis enregistré : document (configuration de la facture, titre DEVIS), impression, PDF et
 * actions selon le statut. « Générer la facture » ouvre la caisse avec le devis : la facture
 * est la vente que l'utilisateur y valide (stock, paiement), rattachée ensuite au devis.
 */
@Component({
  selector: 'app-quote-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    InvoiceDocumentComponent,
    InvoiceDrawerComponent
  ],
  templateUrl: './quote-detail-page.component.html',
  styleUrl: './quote-detail-page.component.scss'
})
export class QuoteDetailPageComponent implements OnInit {
  private readonly api = inject(QuotesApiService);
  private readonly salesApi = inject(SalesApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly settingsStore = inject(InvoiceSettingsStore);
  private readonly warehouseCtx = inject(WarehouseContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  @ViewChild(InvoiceDocumentComponent) private document?: InvoiceDocumentComponent;
  @ViewChild('invoiceDrawer') private invoiceDrawer?: MatDrawer;

  /** Interface seulement : le serveur contrôle chaque droit. */
  readonly canManage = this.auth.hasPermission('quote:manage');
  readonly canSell = this.auth.hasPermission('sale:create');
  readonly canReadSales = this.auth.hasPermission('sale:read');

  readonly statusLabels = quoteStatusLabels;
  readonly badge = quoteBadge;

  readonly quote = signal<Quote | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Action en cours (bouton désactivé, pas de double envoi). */
  readonly busy = signal<string | null>(null);
  readonly settings = signal<InvoiceSettings>(defaultInvoiceSettings());
  readonly logoUrl = signal<string | null>(null);
  readonly invoiceSale = signal<Sale | null>(null);

  readonly editable = computed(() => !!this.quote() && isQuoteEditable(this.quote()!));
  readonly invoiceable = computed(() => !!this.quote() && isQuoteInvoiceable(this.quote()!));

  readonly documentData = computed(() => {
    const q = this.quote();
    return q ? quoteToDocumentData({ ...q, warehouseName: this.warehouseNameOf(q) }) : null;
  });

  ngOnInit(): void {
    this.settingsStore
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ settings, logoUrl }) => {
          this.settings.set(settingsOf(settings));
          this.logoUrl.set(logoUrl);
        },
        error: () => undefined
      });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.load(params.get('id')!));
  }

  load(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get(id).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.loadError.set(e instanceof HttpErrorResponse ? toMessage(e) : 'Devis introuvable.');
      }
    });
  }

  issue(): Promise<void> {
    return this.run('issue', (q) => this.api.issue(q.id), 'Devis émis.');
  }

  accept(): Promise<void> {
    return this.run('accept', (q) => this.api.accept(q.id), 'Devis marqué comme accepté.');
  }

  async refuse(): Promise<void> {
    const q = this.quote();
    if (!q) return;
    const ok = await confirmWith(this.dialog, {
      title: 'Marquer le devis comme refusé ?',
      message: `Le devis ${q.number} ne pourra plus être modifié ni facturé.`,
      confirmLabel: 'Refusé par le client'
    });
    if (ok) await this.run('refuse', (x) => this.api.refuse(x.id), 'Devis marqué comme refusé.');
  }

  async cancel(): Promise<void> {
    const q = this.quote();
    if (!q) return;
    const ok = await confirmWith(this.dialog, {
      title: 'Annuler ce devis ?',
      message: `Le devis ${q.number} restera consultable mais ne pourra plus être modifié ni facturé.`,
      confirmLabel: 'Annuler le devis'
    });
    if (ok) await this.run('cancel', (x) => this.api.cancel(x.id, null), 'Devis annulé.');
  }

  async duplicate(): Promise<void> {
    const q = this.quote();
    if (!q || this.busy()) return;
    this.busy.set('duplicate');
    try {
      const copy = await firstValueFrom(this.api.duplicate(q.id));
      this.snackbar.open(`Devis ${copy.number} créé (copie de ${q.number}).`, 'OK', { duration: 3500 });
      void this.router.navigate(['/quotes', copy.id, 'edit']);
    } catch (e) {
      this.error(e, 'Duplication impossible.');
    } finally {
      this.busy.set(null);
    }
  }

  async print(): Promise<void> {
    const root = this.document?.root();
    if (!root || this.busy()) return;
    this.busy.set('print');
    try {
      await printInvoice(root, this.settings().appearance, `Devis ${this.quote()?.number ?? ''}`);
    } finally {
      this.busy.set(null);
    }
  }

  async downloadPdf(): Promise<void> {
    const root = this.document?.root();
    const q = this.quote();
    if (!root || !q || this.busy()) return;
    this.busy.set('pdf');
    try {
      await exportInvoicePdf(root, this.settings().appearance, `devis_${q.number}.pdf`);
    } catch {
      this.snackbar.open('Export PDF impossible : réessayez.', 'OK', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }

  /**
   * Facture : la vente se fait à la caisse du dépôt du devis, aux prix du catalogue ; les écarts
   * avec les prix du devis sont annoncés avant de continuer.
   */
  async generateInvoice(): Promise<void> {
    const q = this.quote();
    if (!q || this.busy()) return;
    if (q.warehouseId !== this.warehouseCtx.warehouseId) {
      this.snackbar.open(
        `Ce devis a été établi dans le dépôt « ${this.warehouseNameOf(q) ?? 'd’origine'} » : sélectionnez ce dépôt pour le facturer.`,
        'OK',
        { duration: 6000 }
      );
      return;
    }
    this.busy.set('invoice');
    let gaps: string[] = [];
    try {
      const catalog = await firstValueFrom(this.productsApi.list());
      gaps = q.lines
        .map((l) => ({ l, p: catalog.items.find((p) => p.id === l.productId) }))
        .filter(({ l, p }) => !p || Number(p.retailPrice) !== Number(l.unitPrice))
        .map(({ l, p }) =>
          p ? `${l.productName} : ${Number(l.unitPrice)} au devis, ${Number(p.retailPrice)} au catalogue` : `${l.productName} : introuvable`
        );
    } catch {
      // Écarts non vérifiables : la caisse affichera de toute façon ses propres prix.
    } finally {
      this.busy.set(null);
    }
    const ok = await confirmWith(this.dialog, {
      title: 'Générer la facture du devis ' + q.number,
      message:
        'La facture d’un devis est une vente : la caisse va s’ouvrir avec le client, les produits et les quantités du devis. ' +
        'Vous y choisirez le paiement (comptant, partiel ou à crédit) puis validerez la vente, qui sort le stock et ' +
        'encaisse comme toute vente (caisse ouverte nécessaire pour un paiement). Le devis passera alors à « Facturé ». ' +
        (gaps.length > 0
          ? `Attention, la caisse applique les prix du catalogue, différents du devis pour : ${gaps.join(' ; ')}.`
          : 'Les prix du catalogue sont identiques à ceux du devis.'),
      confirmLabel: 'Ouvrir la caisse'
    });
    if (ok) void this.router.navigate(['/sales/new'], { queryParams: { quote: q.id } });
  }

  /** Facture du devis : la vente, affichée comme dans l'historique des ventes. */
  async openInvoice(): Promise<void> {
    const q = this.quote();
    if (!q?.saleId || this.busy()) return;
    this.busy.set('open-invoice');
    try {
      this.invoiceSale.set(await firstValueFrom(this.salesApi.get(q.saleId)));
      await this.invoiceDrawer?.open();
    } catch (e) {
      this.error(e, 'Facture introuvable.');
    } finally {
      this.busy.set(null);
    }
  }

  closeInvoice(): void {
    void this.invoiceDrawer?.close();
  }

  private warehouseNameOf(q: Quote): string | null {
    return q.warehouseId === this.warehouseCtx.warehouseId ? this.warehouseCtx.warehouseName : null;
  }

  private async run(action: string, call: (q: Quote) => Observable<Quote>, success: string): Promise<void> {
    const q = this.quote();
    if (!q || this.busy()) return;
    this.busy.set(action);
    try {
      this.quote.set(await firstValueFrom(call(q)));
      this.snackbar.open(success, 'OK', { duration: 3000 });
    } catch (e) {
      this.error(e, 'Action impossible.');
    } finally {
      this.busy.set(null);
    }
  }

  private error(e: unknown, fallback: string): void {
    // Erreur HTTP : déjà annoncée par l'intercepteur ; la page garde l'état du serveur.
    if (!(e instanceof HttpErrorResponse)) this.snackbar.open(fallback, 'OK', { duration: 4000 });
  }
}
