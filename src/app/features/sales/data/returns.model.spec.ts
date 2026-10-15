import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CustomerReturn } from '../../../core/models/customer-return.model';
import { Sale } from '../../../core/models/sale.model';
import { CustomerReturnDialogComponent } from '../ui/customer-return-dialog.component';
import { estimateReturn, hasReturnableItems, returnableLines } from './returns.model';

const SALE: Sale = {
  id: 's1',
  number: 'VTE-2026-000010',
  type: 'RETAIL',
  customerId: 'c1',
  customerName: 'Adjoua Diomandé',
  paymentMethod: 'MOBILE_MONEY',
  paidAmount: 70000,
  total: 70000,
  profit: 0,
  createdAt: '2026-10-15T10:00:00Z',
  createdByUserId: 'u1',
  status: 'COMPLETED',
  items: [
    // 2 montures à 35 000 avec 10 % de remise : 31 500 net l'unité.
    { productId: 'frame', productName: 'Monture', productSku: 'MON-1', quantity: 2, unitPrice: 35000, lineTotal: 63000 },
    { productId: 'cloth', productName: 'Chiffon', productSku: 'ACC-1', quantity: 10, unitPrice: 700, lineTotal: 7000 }
  ]
};

function returnOf(productId: string, quantity: number): CustomerReturn {
  return {
    id: `r-${productId}`, number: 'RET-1', saleId: 's1', warehouseId: 'w', settlement: 'REFUND', totalAmount: 0,
    reason: 'x', createdAt: '', createdByUserId: 'u',
    lines: [{ id: 'l', lineNumber: 1, saleLineId: 'sl', productId, quantity, amount: 0, condition: 'RESELLABLE' }]
  };
}

describe('Retours : quantités restantes et montant estimé', () => {
  it('quantité restante = vendue − déjà retournée ; prix unitaire net (remise comprise)', () => {
    const lines = returnableLines(SALE, [returnOf('cloth', 4), returnOf('cloth', 1)]);
    expect(lines.find((l) => l.productId === 'cloth')).toMatchObject({ sold: 10, alreadyReturned: 5, remaining: 5 });
    expect(lines.find((l) => l.productId === 'frame')).toMatchObject({ remaining: 2, unitNet: 31500 });
  });

  it('montant estimé au prix net ; plus rien à retourner une fois tout rendu', () => {
    const lines = returnableLines(SALE, []);
    expect(estimateReturn(lines, { frame: 1, cloth: 3 })).toBe(31500 + 2100);
    expect(hasReturnableItems(returnableLines(SALE, [returnOf('frame', 2), returnOf('cloth', 10)]))).toBe(false);
  });
});

describe('CustomerReturnDialogComponent', () => {
  function open(sale: Sale = SALE, returns: CustomerReturn[] = []) {
    const closed: unknown[] = [];
    TestBed.configureTestingModule({
      imports: [CustomerReturnDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { sale, returns } },
        { provide: MatDialogRef, useValue: { close: (v: unknown) => closed.push(v) } }
      ]
    });
    const fixture = TestBed.createComponent(CustomerReturnDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, closed };
  }

  it('produit la requête : articles saisis seulement, sans montant ; moyen de la vente par défaut', () => {
    const { component, closed } = open();
    component.form.controls.lines.at(1).patchValue({ quantity: 3, condition: 'DEFECTIVE' });
    component.form.controls.reason.setValue('  Chiffons tachés  ');
    expect(component.estimate()).toBe(2100);

    component.confirm();

    expect(closed).toEqual([{
      settlement: 'REFUND',
      refundMethod: 'MOBILE_MONEY',
      reason: 'Chiffons tachés',
      items: [{ productId: 'cloth', quantity: 3, condition: 'DEFECTIVE' }]
    }]);
  });

  it('avoir sur la dette : pas de moyen de remboursement envoyé', () => {
    const { component, closed } = open();
    component.form.controls.lines.at(0).patchValue({ quantity: 1 });
    component.form.patchValue({ settlement: 'ACCOUNT_CREDIT', reason: 'Monture abîmée' });
    component.confirm();
    expect(closed[0]).toMatchObject({ settlement: 'ACCOUNT_CREDIT', refundMethod: undefined });
  });

  it('refuse : aucun article, quantité au-delà du restant, motif vide', () => {
    const { component, closed } = open(SALE, [returnOf('cloth', 8)]);
    component.form.controls.reason.setValue('Motif');
    component.confirm();
    expect(component.error).toBe('Indiquez au moins un article à retourner.');

    component.form.controls.lines.at(1).patchValue({ quantity: 3 });
    component.confirm();
    expect(component.error).toBe('Une quantité dépasse ce qui reste à retourner.');

    component.form.controls.lines.at(1).patchValue({ quantity: 2 });
    component.form.controls.reason.setValue('   ');
    component.confirm();
    expect(component.error).toBe('Le motif du retour est obligatoire.');
    expect(closed).toEqual([]);
  });
});
