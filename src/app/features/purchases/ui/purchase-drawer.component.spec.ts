import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { PurchaseDrawerComponent, PurchaseDrawerContext } from './purchase-drawer.component';

const BASE: PurchaseOrder = {
  id: 'o1',
  number: 'CMD-2026-000012',
  supplierId: 's1',
  supplierName: 'Essilor',
  status: 'PENDING',
  documentStatus: 'PARTIALLY_RECEIVED',
  createdAt: '2026-10-01T09:00:00Z',
  lines: [
    {
      productId: 'p1',
      productSku: 'MON-1',
      productName: 'Monture',
      quantity: 10,
      receivedQuantity: 4,
      unitPurchasePrice: 10000,
      lineTotal: 100000
    }
  ],
  totalAmount: 100000,
  receivedAmount: 40000,
  paidAmount: 0,
  remainingToPay: 100000
};

describe('PurchaseDrawerComponent (détail commande)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PurchaseDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    });
  });

  function open(order: PurchaseOrder, canPay = true): PurchaseDrawerComponent {
    const fixture = TestBed.createComponent(PurchaseDrawerComponent);
    const drawer = fixture.componentInstance;
    drawer.ctx = {
      mode: 'DETAIL',
      orderId: order.id,
      orders: [order],
      suppliers: [],
      products: [],
      canReceive: true,
      canPay
    } satisfies PurchaseDrawerContext;
    drawer.ngOnChanges();
    fixture.detectChanges();
    return drawer;
  }

  it('libellés, quantités reçues et total viennent de la commande du backend', () => {
    const drawer = open(BASE);
    const line = drawer.lines[0];
    expect(drawer.productName(line)).toBe('Monture');
    expect(drawer.productSku(line)).toBe('MON-1');
    expect(line.receivedQuantity).toBe(4);
    expect(drawer.totalAmount()).toBe(100000);
  });

  it('facture : saisissable seulement si la commande est reçue ou soldée, sans facture, avec purchase:pay', () => {
    expect(open(BASE).canInvoice).toBe(false);
    const closed: PurchaseOrder = { ...BASE, status: 'DELIVERED', documentStatus: 'CLOSED', remainingToPay: 40000 };
    const drawer = open(closed);
    expect(drawer.canInvoice).toBe(true);
    expect(drawer.form.controls.invoiceNumber.enabled).toBe(true);
    expect(drawer.form.controls.supplierId.enabled).toBe(false);

    expect(open(closed, false).canInvoice).toBe(false);
    expect(
      open({ ...closed, invoice: { invoiceNumber: 'FA-1', invoiceDateIso: '2026-10-05', totalAmount: 40000 } }).canInvoice
    ).toBe(false);
  });
});
