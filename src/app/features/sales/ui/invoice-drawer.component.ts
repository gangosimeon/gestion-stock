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

  trackByIndex(i: number): number {
    return i;
  }
}
