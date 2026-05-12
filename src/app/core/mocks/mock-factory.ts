/**
 * mock-factory.ts
 * Factories TypeScript pour générer des entités de test supplémentaires.
 * Usage: MockFactory.sale(), MockFactory.product(), etc.
 */

import { Product } from '../models/product.model';
import { Customer } from '../models/customer.model';
import { Sale } from '../models/sale.model';
import { StockMovement } from '../models/stock-movement.model';
import { Expense } from '../models/expense.model';
import { Appointment } from '../models/appointment.model';
import { PurchaseOrder } from '../models/purchase-order.model';

// ─── ID generator ────────────────────────────────────────────────────────────
let _seq = 9000;
const uid = (prefix: string): string => `${prefix}_${++_seq}`;

// ─── Date helpers ─────────────────────────────────────────────────────────────
const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();
const daysFromNow = (n: number): string => new Date(Date.now() + n * 86_400_000).toISOString();

// ─── Default overrides type ───────────────────────────────────────────────────
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

// ─── Product Factory ──────────────────────────────────────────────────────────
function product(overrides: DeepPartial<Product> = {}): Product {
  const purchase = overrides.purchasePrice ?? 5_000;
  const retail = overrides.retailPrice ?? Math.round(purchase * 2.5);
  const wholesale = overrides.wholesalePrice ?? Math.round(purchase * 2);
  return {
    id: uid('p'),
    sku: `SKU-${_seq}`,
    name: `Produit Test ${_seq}`,
    categoryId: 'cat_1',
    categoryName: 'Montures',
    supplierId: 'sup_1',
    purchasePrice: purchase,
    retailPrice: retail,
    wholesalePrice: wholesale,
    stockQuantity: 20,
    alertThreshold: 5,
    ...overrides
  } as Product;
}

// ─── Customer Factory ─────────────────────────────────────────────────────────
const SAMPLE_NAMES = [
  'Koffi Adjoumani', 'Awa Diallo', 'Seydou Traoré', 'Binta Kouyaté',
  'Lamine Touré', 'Ramatou Bah', 'Cheikh Fall', 'Maimouna Cissé'
];
function customer(overrides: DeepPartial<Customer> = {}): Customer {
  const name = SAMPLE_NAMES[_seq % SAMPLE_NAMES.length];
  return {
    id: uid('c'),
    name,
    phone: `+225 07 ${String(_seq).padStart(2, '0')} ${String(_seq + 10).padStart(2, '0')} ${String(_seq + 20).padStart(2, '0')}`,
    email: `${name.toLowerCase().replace(' ', '.')}@test.ci`,
    creditLimit: 0,
    ...overrides
  } as Customer;
}

// ─── Sale Factory ─────────────────────────────────────────────────────────────
function sale(overrides: DeepPartial<Sale> = {}): Sale {
  const unitPrice = 15_000;
  const purchasePrice = 5_000;
  const quantity = 1;
  const total = unitPrice * quantity;
  const profit = (unitPrice - purchasePrice) * quantity;
  return {
    id: uid('s'),
    type: 'RETAIL',
    items: [{ productId: 'p_1', quantity, unitPrice, purchasePrice }],
    paymentMethod: 'CASH',
    paidAmount: total,
    total,
    profit,
    createdAt: daysAgo(1),
    createdByUserId: 'u_cashier',
    ...overrides
  } as Sale;
}

// ─── Credit Sale Factory ──────────────────────────────────────────────────────
function creditSale(customerId: string, totalAmount: number, paidAmount = 0): Sale {
  return sale({
    customerId,
    type: 'RETAIL',
    paymentMethod: 'CASH',
    total: totalAmount,
    paidAmount,
    profit: Math.round(totalAmount * 0.4)
  });
}

// ─── StockMovement Factory ────────────────────────────────────────────────────
function stockMovement(overrides: DeepPartial<StockMovement> = {}): StockMovement {
  return {
    id: uid('sm'),
    productId: 'p_1',
    quantity: 10,
    reason: 'SUPPLY',
    note: 'Mouvement test',
    createdAt: daysAgo(0),
    createdByUserId: 'u_mgr',
    ...overrides
  } as StockMovement;
}

// ─── Expense Factory ──────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['transport', 'loyer', 'electricite', 'salaires', 'maintenance', 'fournitures'];
function expense(overrides: DeepPartial<Expense> = {}): Expense {
  const cat = EXPENSE_CATEGORIES[_seq % EXPENSE_CATEGORIES.length];
  return {
    id: uid('exp'),
    category: cat,
    label: `Dépense test – ${cat}`,
    amount: 10_000,
    expenseDateIso: new Date().toISOString().slice(0, 10),
    createdAt: daysAgo(0),
    createdByUserId: 'u_admin',
    ...overrides
  } as Expense;
}

// ─── Appointment Factory ──────────────────────────────────────────────────────
function appointment(overrides: DeepPartial<Appointment> = {}): Appointment {
  return {
    id: uid('apt'),
    customerName: 'Client Test',
    phone: '+225 07 00 00 00',
    dateTime: daysFromNow(1),
    status: 'SCHEDULED',
    note: 'Rendez-vous test',
    ...overrides
  } as Appointment;
}

// ─── PurchaseOrder Factory ────────────────────────────────────────────────────
function purchaseOrder(supplierId = 'sup_1', supplierName = 'Essilor Distribution CI'): PurchaseOrder {
  const qty = 20;
  const unitPrice = 3_500;
  return {
    id: uid('po'),
    supplierId,
    supplierName,
    status: 'PENDING',
    createdAt: daysAgo(2),
    lines: [
      { productId: 'p_5', productSku: 'VER-UNI-SP', productName: 'Verre Unifocal Sphérique', quantity: qty, unitPurchasePrice: unitPrice, lineTotal: qty * unitPrice }
    ],
    totalAmount: qty * unitPrice,
    paidAmount: 0
  };
}

// ─── Bulk generators ─────────────────────────────────────────────────────────
function manySales(count: number, overrides: DeepPartial<Sale> = {}): Sale[] {
  return Array.from({ length: count }, (_, i) =>
    sale({ ...overrides, createdAt: daysAgo(i) })
  );
}

function manyProducts(count: number, categoryId = 'cat_1', categoryName = 'Montures'): Product[] {
  return Array.from({ length: count }, () =>
    product({ categoryId, categoryName })
  );
}

// ─── Scenario builder ─────────────────────────────────────────────────────────
/**
 * Génère un scénario complet : un client avec crédit, des ventes à crédit
 * et un historique de paiements.
 */
function creditScenario(clientName: string, creditLimit: number) {
  const c = customer({ name: clientName, creditLimit });
  const sales = [
    creditSale(c.id, creditLimit * 0.5, 0),
    creditSale(c.id, creditLimit * 0.3, creditLimit * 0.15)
  ];
  const totalDue = sales.reduce((s, v) => s + (v.total - v.paidAmount), 0);
  return { customer: c, sales, totalDue };
}

// ─── Export ───────────────────────────────────────────────────────────────────
export const MockFactory = {
  product,
  customer,
  sale,
  creditSale,
  stockMovement,
  expense,
  appointment,
  purchaseOrder,
  manySales,
  manyProducts,
  creditScenario
};
