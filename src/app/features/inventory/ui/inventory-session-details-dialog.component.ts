import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { InventorySession } from '../../../core/models/inventory.model';

export type InventorySessionDetailsDialogData = {
  session: InventorySession;
};

@Component({
  selector: 'app-inventory-session-details-dialog',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatDialogModule, MatButtonModule, MatTableModule],
  templateUrl: './inventory-session-details-dialog.component.html'
})
export class InventorySessionDetailsDialogComponent {
  readonly data = inject<InventorySessionDetailsDialogData>(MAT_DIALOG_DATA);

  readonly columns = ['product', 'system', 'physical', 'diff'] as const;
}
