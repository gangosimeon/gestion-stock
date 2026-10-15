import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { CustomerReturn, settlementLabels } from '../../../core/models/customer-return.model';
import { Customer } from '../../../core/models/customer.model';
import { PaymentMethod, Sale } from '../../../core/models/sale.model';
import { paymentMethodLabels } from '../data/sales-vm.model';

@Component({
  selector: 'app-invoice-drawer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './invoice-drawer.component.html',
  styleUrl: './invoice-drawer.component.scss'
})
export class InvoiceDrawerComponent {
  @Input({ required: true }) sale!: Sale;
  @Input() customer: Customer | null = null;
  /** Retours enregistrés sur cette vente (historique) ; vide pour une vente qui vient d'être faite. */
  @Input() returns: CustomerReturn[] = [];

  readonly settlementLabels = settlementLabels;

  get returnedTotal(): number {
    return this.returns.reduce((sum, r) => sum + Number(r.totalAmount ?? 0), 0);
  }
  @Output() readonly close = new EventEmitter<void>();

  requestClose(): void {
    this.close.emit();
  }

  print(): void {
    window.print();
  }

  async exportPdf(): Promise<void> {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const marginX = 40;
    let y = 48;

    doc.setFontSize(16);
    doc.text(this.sale.status === 'CANCELLED' ? 'Facture — VENTE ANNULÉE' : 'Facture', marginX, y);
    y += 18;

    doc.setFontSize(10);
    doc.text(`N°: ${this.sale.number ?? this.sale.id}`, marginX, y);
    y += 14;
    doc.text(`Date: ${new Date(this.sale.createdAt).toLocaleString()}`, marginX, y);
    y += 14;
    doc.text(`Client: ${this.sale.customerName ?? this.customer?.name ?? 'Comptoir'}`, marginX, y);
    y += 18;

    doc.setFontSize(11);
    doc.text('Articles', marginX, y);
    y += 14;

    doc.setFontSize(10);
    for (const it of this.sale.items) {
      // Montants de la vente enregistrée (backend).
      const line = `${it.productName ?? it.productId}  |  Qté: ${it.quantity}  |  PU: ${it.unitPrice}  |  Total: ${it.lineTotal ?? it.unitPrice * it.quantity}`;
      doc.text(line, marginX, y);
      y += 12;

      if (y > 760) {
        doc.addPage();
        y = 48;
      }
    }

    y += 10;
    doc.setFontSize(12);
    doc.text(`Total: ${this.sale.total}`, marginX, y);
    y += 14;
    doc.setFontSize(10);
    doc.text(`Payé (${this.methodLabel(this.sale.paymentMethod)}): ${this.sale.paidAmount}`, marginX, y);
    if (this.sale.creditAmount) {
      y += 14;
      doc.text(`À crédit (compte client): ${this.sale.creditAmount}`, marginX, y);
    }

    doc.save(`facture_${this.sale.number ?? this.sale.id}.pdf`);
  }

  methodLabel(method: PaymentMethod): string {
    return paymentMethodLabels[method] ?? method;
  }

  trackByIndex(i: number): number {
    return i;
  }
}
