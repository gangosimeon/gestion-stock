import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { CashEntryType, CashOperation, CashRegisterSession } from '../../../core/models/cash-register.model';

const ENTRY_TYPE_LABELS: Record<CashEntryType, string> = {
  SALE: 'Vente',
  CUSTOMER_PAYMENT: 'Règlement client',
  CASH_IN: 'Apport',
  CORRECTION_IN: 'Correction (entrée)',
  SALE_REFUND: 'Remboursement vente',
  RETURN_REFUND: 'Remboursement retour',
  CASH_OUT: 'Sortie',
  CORRECTION_OUT: 'Correction (sortie)',
  SUPPLIER_PAYMENT: 'Paiement fournisseur',
  EXPENSE: 'Dépense',
  EXPENSE_CANCELLATION: 'Dépense annulée (retour en caisse)'
};

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

  readonly columns = ['date', 'number', 'type', 'amount', 'note'] as const;

  /** Nature de l'écriture (backend), sinon simple sens. */
  typeLabel(o: CashOperation): string {
    if (o.entryType) return ENTRY_TYPE_LABELS[o.entryType];
    return o.type === 'IN' ? 'Entrée' : 'Sortie';
  }
}
