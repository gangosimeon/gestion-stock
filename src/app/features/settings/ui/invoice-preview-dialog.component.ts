import { Component, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { InvoiceSettings } from '../../../core/models/invoice-settings.model';
import { InvoiceData } from '../../../shared/invoice/invoice-data';
import { InvoiceDocumentComponent } from '../../../shared/invoice/invoice-document.component';
import { printInvoice } from '../../../shared/invoice/invoice-output';

export interface InvoicePreviewDialogData {
  settings: InvoiceSettings;
  data: InvoiceData;
  logoUrl: string | null;
}

/** Aperçu de la facture en grand, avec les données d'exemple et la configuration en cours. */
@Component({
  selector: 'app-invoice-preview-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, InvoiceDocumentComponent],
  template: `
    <h2 mat-dialog-title>Aperçu de la facture</h2>
    <div mat-dialog-content class="preview-dialog__content">
      <app-invoice-document [settings]="data.settings" [data]="data.data" [logoUrl]="data.logoUrl" [preview]="true" />
    </div>
    <div mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="print()" [disabled]="printing()">
        <mat-icon>print</mat-icon>
        Imprimer l'aperçu
      </button>
      <button mat-flat-button color="primary" mat-dialog-close>Fermer</button>
    </div>
  `,
  styles: `
    .preview-dialog__content {
      background: var(--color-surface-muted);
      padding-top: 16px;
    }
  `
})
export class InvoicePreviewDialogComponent {
  readonly data = inject<InvoicePreviewDialogData>(MAT_DIALOG_DATA);
  readonly printing = signal(false);

  @ViewChild(InvoiceDocumentComponent) private document?: InvoiceDocumentComponent;

  async print(): Promise<void> {
    const root = this.document?.root();
    if (!root) return;
    this.printing.set(true);
    try {
      await printInvoice(root, this.data.settings.appearance, 'Aperçu de la facture');
    } finally {
      this.printing.set(false);
    }
  }
}
