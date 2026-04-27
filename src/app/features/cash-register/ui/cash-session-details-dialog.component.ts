import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { CashOperation, CashRegisterSession } from '../../../core/models/cash-register.model';

export type CashSessionDetailsDialogData = {
  session: CashRegisterSession;
  operations: CashOperation[];
};

@Component({
  selector: 'app-cash-session-details-dialog',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatDialogModule, MatButtonModule, MatTableModule],
  templateUrl: './cash-session-details-dialog.component.html'
})
export class CashSessionDetailsDialogComponent {
  readonly data = inject<CashSessionDetailsDialogData>(MAT_DIALOG_DATA);

  readonly columns = ['date', 'type', 'amount', 'note'] as const;
}
