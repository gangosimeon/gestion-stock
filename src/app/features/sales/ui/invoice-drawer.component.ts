import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { Customer } from '../../../core/models/customer.model';
import { Sale } from '../../../core/models/sale.model';

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
    doc.text('Facture', marginX, y);
    y += 18;

    doc.setFontSize(10);
    doc.text(`Réf: ${this.sale.id}`, marginX, y);
    y += 14;
    doc.text(`Date: ${new Date(this.sale.createdAt).toLocaleString()}`, marginX, y);
    y += 14;
    doc.text(`Client: ${this.customer?.name ?? 'Comptoir'}`, marginX, y);
    y += 18;

    doc.setFontSize(11);
    doc.text('Articles', marginX, y);
    y += 14;

    doc.setFontSize(10);
    for (const it of this.sale.items) {
      const line = `${it.productId}  |  Qté: ${it.quantity}  |  PU: ${it.unitPrice}  |  Total: ${it.unitPrice * it.quantity}`;
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
    doc.text(`Paiement: ${this.sale.paymentMethod}`, marginX, y);

    doc.save(`facture_${this.sale.id}.pdf`);
  }

  trackByIndex(i: number): number {
    return i;
  }
}
