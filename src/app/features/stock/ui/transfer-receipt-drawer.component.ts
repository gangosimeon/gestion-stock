import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InvoiceSettings, defaultInvoiceSettings, settingsOf } from '../../../core/models/invoice-settings.model';
import { StockTransfer } from '../../../core/models/stock-transfer.model';
import { InvoiceSettingsStore } from '../../../core/services/invoice-settings-api.service';
import { InvoiceData } from '../../../shared/invoice/invoice-data';
import { InvoiceDocumentComponent } from '../../../shared/invoice/invoice-document.component';
import { exportInvoicePdf, printInvoice } from '../../../shared/invoice/invoice-output';
import { transferToDocumentData } from '../../../shared/invoice/transfer-document';

/**
 * Reçu d'un transfert (bon de transfert), mis en page selon la configuration de la facture
 * (Paramètres) : à revoir, imprimer ou exporter en PDF, juste après le transfert ou depuis
 * l'historique.
 */
@Component({
  selector: 'app-transfer-receipt-drawer',
  standalone: true,
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatProgressSpinnerModule, InvoiceDocumentComponent],
  templateUrl: './transfer-receipt-drawer.component.html',
  styleUrl: './transfer-receipt-drawer.component.scss'
})
export class TransferReceiptDrawerComponent implements OnChanges {
  @Input({ required: true }) transfer!: StockTransfer;

  @Output() readonly close = new EventEmitter<void>();

  @ViewChild(InvoiceDocumentComponent) private document?: InvoiceDocumentComponent;

  private readonly store = inject(InvoiceSettingsStore);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings = signal<InvoiceSettings | null>(null);
  readonly logoUrl = signal<string | null>(null);
  /** La configuration n'a pas pu être lue : présentation par défaut, sans coordonnées. */
  readonly settingsUnavailable = signal(false);
  readonly data = signal<InvoiceData | null>(null);
  readonly busy = signal<'print' | 'pdf' | null>(null);

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
    this.data.set(this.transfer ? transferToDocumentData(this.transfer) : null);
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
      await printInvoice(root, settings.appearance, `Bon de transfert ${this.transfer.number}`);
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
      await exportInvoicePdf(root, settings.appearance, `transfert_${this.transfer.number}.pdf`);
    } catch {
      this.snackbar.open('Export PDF impossible : réessayez.', 'OK', { duration: 4000 });
    } finally {
      this.busy.set(null);
    }
  }
}
