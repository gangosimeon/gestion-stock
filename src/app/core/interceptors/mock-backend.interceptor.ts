import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import { Appointment } from '../models/appointment.model';
import { Category } from '../models/category.model';
import { Customer } from '../models/customer.model';
import { DailyReport, MonthlyReport, YearlyReport } from '../models/report.model';
import { Role } from '../models/role.model';
import { Sale } from '../models/sale.model';
import { StockMovement } from '../models/stock-movement.model';
import { Supplier } from '../models/supplier.model';
import { SupplierPurchaseHistory } from '../models/supplier-purchase-history.model';
import { SupplierPayment } from '../models/supplier-payment.model';
import { PurchaseOrder, SupplierInvoice } from '../models/purchase-order.model';
import { User } from '../models/user.model';

type LoginBody = {
  username?: string;
  password?: string;
};

type LoginResponse = {
  accessToken: string;
  user: User;
};

const NETWORK_DELAY_MS = 250;

let mockUsers: User[] = [
  {
    id: 'u_admin',
    username: 'admin',
    fullName: 'Admin',
    roles: ['ADMIN'],
    isActive: true
  },
  {
    id: 'u_cashier',
    username: 'caissier',
    fullName: 'Caissier',
    roles: ['CAISSIER'],
    isActive: true
  },
  {
    id: 'u_stock',
    username: 'gestion',
    fullName: 'Gestionnaire Stock',
    roles: ['GESTIONNAIRE'],
    isActive: true
  }
];

let mockSupplierPayments: SupplierPayment[] = [
  {
    id: 'pay_1',
    supplierId: 'sup_1',
    paymentDateIso: new Date(Date.now() - 2 * 86400_000).toISOString(),
    amount: 3000,
    note: 'Acompte'
  }
];

let mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po_1',
    supplierId: 'sup_1',
    supplierName: 'Fournisseur Démo',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    lines: [
      {
        productId: 'p_1',
        productSku: 'SKU-0001',
        productName: 'Produit Démo 1',
        quantity: 10,
        unitPurchasePrice: 950,
        lineTotal: 9500
      }
    ],
    totalAmount: 9500,
    paidAmount: 0
  }
];

let mockSuppliers: Supplier[] = [
  {
    id: 'sup_1',
    name: 'Fournisseur Démo',
    phone: '+225 00 00 00 00',
    email: 'demo@supplier.test',
    address: 'Abidjan',
    deliveryLeadTimeDays: 3
  },
  {
    id: 'sup_2',
    name: 'Grossiste Central',
    phone: '+225 11 11 11 11',
    email: 'central@supplier.test',
    address: 'Zone Industrielle',
    deliveryLeadTimeDays: 7
  }
];

let mockSupplierPurchases: SupplierPurchaseHistory[] = [
  {
    id: 'sp_1',
    supplierId: 'sup_1',
    purchaseDateIso: new Date(Date.now() - 10 * 86400_000).toISOString(),
    reference: 'PO-0001',
    itemsCount: 12,
    totalAmount: 125000
  },
  {
    id: 'sp_2',
    supplierId: 'sup_1',
    purchaseDateIso: new Date(Date.now() - 4 * 86400_000).toISOString(),
    reference: 'PO-0007',
    itemsCount: 5,
    totalAmount: 43000
  },
  {
    id: 'sp_3',
    supplierId: 'sup_2',
    purchaseDateIso: new Date(Date.now() - 18 * 86400_000).toISOString(),
    reference: 'PO-0002',
    itemsCount: 20,
    totalAmount: 210000
  }
];

let mockCustomers: Customer[] = [
  { id: 'c_1', name: 'Client comptoir' },
  { id: 'c_2', name: 'Optique Pro', phone: '+225 00 00 00 00' }
];

let mockAppointments: Appointment[] = [
  {
    id: 'a_1',
    customerName: 'Client Démo',
    phone: '000000000',
    dateTime: new Date(Date.now() + 3600_000).toISOString(),
    status: 'SCHEDULED',
    note: 'Contrôle'
  }
];

let mockStockMovements: StockMovement[] = [
  {
    id: 'sm_1',
    productId: 'p_1',
    quantity: 10,
    reason: 'SUPPLY',
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
    createdByUserId: 'u_stock'
  },
  {
    id: 'sm_2',
    productId: 'p_2',
    quantity: -2,
    reason: 'SALE',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    createdByUserId: 'u_cashier'
  }
];

let mockSales: Sale[] = [
  {
    id: 's_1',
    type: 'RETAIL',
    items: [
      {
        productId: 'p_1',
        quantity: 1,
        unitPrice: 1500,
        purchasePrice: 1000
      }
    ],
    paymentMethod: 'CASH',
    total: 1500,
    profit: 500,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    createdByUserId: 'u_cashier'
  }
];

let mockProducts: Product[] = [
  {
    id: 'p_1',
    sku: 'SKU-0001',
    name: 'Produit Démo 1',
    categoryId: 'cat_1',
    categoryName: 'Verres',
    purchasePrice: 1000,
    retailPrice: 1500,
    wholesalePrice: 1300,
    stockQuantity: 25,
    alertThreshold: 5
  },
  {
    id: 'p_2',
    sku: 'SKU-0002',
    name: 'Produit Démo 2',
    categoryId: 'cat_1',
    categoryName: 'Verres',
    purchasePrice: 500,
    retailPrice: 800,
    wholesalePrice: 700,
    stockQuantity: 4,
    alertThreshold: 5
  }
];

const mockCategories: Category[] = [
  { id: 'cat_1', name: 'Verres' },
  { id: 'cat_2', name: 'Montures' },
  { id: 'cat_3', name: 'Lentilles' }
];

function jsonResponse<T>(body: T, status = 200): HttpResponse<T> {
  return new HttpResponse({ status, body });
}

function httpError(status: number, message: string): Observable<never> {
  return throwError(
    () =>
      new HttpErrorResponse({
        status,
        error: { message }
      })
  );
}

function normalizeUrl(url: string): string {
  // On supporte les appels en URL absolue (environment.apiUrl) ou relative.
  // Ex: http://localhost:3000/api/auth/login -> /api/auth/login
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}

function extractBearer(req: HttpRequest<unknown>): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function userFromToken(token: string): User | null {
  // Token mock: mock-token::<username>
  const parts = token.split('::');
  const username = parts.length === 2 ? parts[1] : null;
  if (!username) return null;
  return mockUsers.find((u) => u.username === username) ?? null;
}

function requireAuth(req: HttpRequest<unknown>): User | null {
  const token = extractBearer(req);
  // Pendant le dev UI (guards désactivés), on autorise un fallback.
  if (!token) return mockUsers[0] ?? null;
  return userFromToken(token);
}

function hasRole(user: User, roles: readonly Role[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}

export const mockBackendInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (!environment.useMocks) return next(req);

  const url = normalizeUrl(req.url);

  // Auth
  if (url.endsWith('/api/auth/login') && req.method === 'POST') {
    const body = (req.body ?? {}) as LoginBody;
    const username = String(body.username ?? '');
    const password = String(body.password ?? '');

    // Règle simple pour dev : password = "admin" pour tous
    if (!username || !password) return httpError(400, 'Identifiants requis.').pipe(delay(NETWORK_DELAY_MS));

    const user = mockUsers.find((u) => u.username === username);
    if (!user) return httpError(401, 'Utilisateur inconnu.').pipe(delay(NETWORK_DELAY_MS));

    if (password !== 'admin') return httpError(401, 'Mot de passe invalide.').pipe(delay(NETWORK_DELAY_MS));

    const response: LoginResponse = {
      accessToken: `mock-token::${user.username}`,
      user
    };

    return of(jsonResponse(response)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/auth/me') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse(user)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Products
  if (url.endsWith('/api/products') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse({ items: mockProducts, total: mockProducts.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/products\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const id = url.split('/').pop() as string;
    const product = mockProducts.find((p) => p.id === id);
    if (!product) return httpError(404, 'Produit introuvable.').pipe(delay(NETWORK_DELAY_MS));

    return of(jsonResponse(product)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Categories
  if (url.endsWith('/api/categories') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse({ items: mockCategories, total: mockCategories.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/products') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const input = req.body as Partial<Product>;
    const created: Product = {
      id: `p_${Date.now()}`,
      sku: String(input.sku ?? `SKU-${Math.floor(Math.random() * 9000) + 1000}`),
      name: String(input.name ?? 'Nouveau produit'),
      categoryId: String(input.categoryId ?? 'cat_1'),
      supplierId: input.supplierId,
      purchasePrice: Number(input.purchasePrice ?? 0),
      retailPrice: Number(input.retailPrice ?? 0),
      wholesalePrice: Number(input.wholesalePrice ?? 0),
      stockQuantity: Number(input.stockQuantity ?? 0),
      alertThreshold: Number(input.alertThreshold ?? 0)
    };

    mockProducts = [created, ...mockProducts];
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/products\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').pop() as string;
    const patch = req.body as Partial<Product>;
    const idx = mockProducts.findIndex((p) => p.id === id);

    if (idx === -1) return httpError(404, 'Produit introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const updated: Product = { ...mockProducts[idx], ...patch, id };
    mockProducts = mockProducts.map((p) => (p.id === id ? updated : p));
    return of(jsonResponse(updated)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/products\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').pop() as string;
    mockProducts = mockProducts.filter((p) => p.id !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(NETWORK_DELAY_MS));
  }

  // Suppliers
  if (url.endsWith('/api/suppliers') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse({ items: mockSuppliers, total: mockSuppliers.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/suppliers') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const input = req.body as Partial<Supplier>;
    const name = String(input.name ?? '').trim();
    const deliveryLeadTimeDays = Number(input.deliveryLeadTimeDays ?? 0);

    if (!name) return httpError(400, 'Nom requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!Number.isFinite(deliveryLeadTimeDays) || deliveryLeadTimeDays < 0) {
      return httpError(400, 'Délai de livraison invalide.').pipe(delay(NETWORK_DELAY_MS));
    }

    const created: Supplier = {
      id: `sup_${Date.now()}`,
      name,
      phone: input.phone ? String(input.phone) : undefined,
      email: input.email ? String(input.email) : undefined,
      address: input.address ? String(input.address) : undefined,
      deliveryLeadTimeDays
    };

    mockSuppliers = [created, ...mockSuppliers];
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/suppliers\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const id = url.split('/').pop() as string;
    const s = mockSuppliers.find((x) => x.id === id);
    if (!s) return httpError(404, 'Fournisseur introuvable.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse(s)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/suppliers\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').pop() as string;
    const patch = req.body as Partial<Supplier>;
    const idx = mockSuppliers.findIndex((x) => x.id === id);
    if (idx === -1) return httpError(404, 'Fournisseur introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const name = patch.name ? String(patch.name).trim() : mockSuppliers[idx].name;
    const deliveryLeadTimeDays = Number(patch.deliveryLeadTimeDays ?? mockSuppliers[idx].deliveryLeadTimeDays);

    if (!name) return httpError(400, 'Nom requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!Number.isFinite(deliveryLeadTimeDays) || deliveryLeadTimeDays < 0) {
      return httpError(400, 'Délai de livraison invalide.').pipe(delay(NETWORK_DELAY_MS));
    }

    const updated: Supplier = {
      ...mockSuppliers[idx],
      ...patch,
      id,
      name,
      phone: patch.phone ? String(patch.phone) : mockSuppliers[idx].phone,
      email: patch.email ? String(patch.email) : mockSuppliers[idx].email,
      address: patch.address ? String(patch.address) : mockSuppliers[idx].address,
      deliveryLeadTimeDays
    };

    mockSuppliers = mockSuppliers.map((x) => (x.id === id ? updated : x));
    return of(jsonResponse(updated)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/suppliers\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').pop() as string;
    mockSuppliers = mockSuppliers.filter((x) => x.id !== id);
    mockSupplierPurchases = mockSupplierPurchases.filter((p) => p.supplierId !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/suppliers\/[^/]+\/purchases$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const supplierId = url.split('/').slice(-2)[0] as string;
    const items = mockSupplierPurchases
      .filter((p) => p.supplierId === supplierId)
      .sort((a, b) => (a.purchaseDateIso < b.purchaseDateIso ? 1 : -1));

    return of(jsonResponse({ items, total: items.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/suppliers\/[^/]+\/payments$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const supplierId = url.split('/').slice(-2)[0] as string;
    const items = mockSupplierPayments
      .filter((p) => p.supplierId === supplierId)
      .sort((a, b) => (a.paymentDateIso < b.paymentDateIso ? 1 : -1));

    return of(jsonResponse({ items, total: items.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/suppliers\/[^/]+\/payments$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const supplierId = url.split('/').slice(-2)[0] as string;
    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    if (!supplier) return httpError(404, 'Fournisseur introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const body = (req.body ?? {}) as { amount?: number; paymentDateIso?: string; orderId?: string; note?: string };
    const amount = Number(body.amount ?? 0);
    const paymentDateIso = String(body.paymentDateIso ?? '').trim();
    const orderId = body.orderId ? String(body.orderId).trim() : undefined;

    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(NETWORK_DELAY_MS));
    if (!paymentDateIso) return httpError(400, 'Date paiement requise.').pipe(delay(NETWORK_DELAY_MS));

    if (orderId) {
      const idx = mockPurchaseOrders.findIndex((o) => o.id === orderId && o.supplierId === supplierId);
      if (idx === -1) return httpError(400, 'Commande invalide.').pipe(delay(NETWORK_DELAY_MS));
      const order = mockPurchaseOrders[idx];
      const remaining = Math.max(0, order.totalAmount - (order.paidAmount ?? 0));
      if (amount > remaining) return httpError(400, 'Montant supérieur au reste à payer.').pipe(delay(NETWORK_DELAY_MS));

      const updated: PurchaseOrder = { ...order, paidAmount: (order.paidAmount ?? 0) + amount };
      mockPurchaseOrders = mockPurchaseOrders.map((o) => (o.id === orderId ? updated : o));
    }

    const created: SupplierPayment = {
      id: `pay_${Date.now()}`,
      supplierId,
      paymentDateIso,
      amount,
      orderId,
      note: body.note ? String(body.note) : undefined
    };

    mockSupplierPayments = [created, ...mockSupplierPayments];
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Purchases (orders)
  if (url.endsWith('/api/purchases/orders') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const items = [...mockPurchaseOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/purchases/orders') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const body = (req.body ?? {}) as {
      supplierId?: string;
      lines?: Array<{ productId?: string; quantity?: number; unitPurchasePrice?: number }>;
    };

    const supplierId = String(body.supplierId ?? '').trim();
    if (!supplierId) return httpError(400, 'Fournisseur requis.').pipe(delay(NETWORK_DELAY_MS));

    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    if (!supplier) return httpError(400, 'Fournisseur invalide.').pipe(delay(NETWORK_DELAY_MS));

    const linesInput = Array.isArray(body.lines) ? body.lines : [];
    if (linesInput.length === 0) return httpError(400, 'Lignes requises.').pipe(delay(NETWORK_DELAY_MS));

    const lines: PurchaseOrder['lines'] = [];

    for (const l of linesInput) {
      const productId = String(l.productId ?? '').trim();
      const qty = Number(l.quantity ?? 0);
      const price = Number(l.unitPurchasePrice ?? 0);
      const product = mockProducts.find((p) => p.id === productId);

      if (!product) return httpError(400, 'Produit invalide.').pipe(delay(NETWORK_DELAY_MS));
      if (!Number.isFinite(qty) || qty <= 0) return httpError(400, 'Quantité invalide.').pipe(delay(NETWORK_DELAY_MS));
      if (!Number.isFinite(price) || price < 0) return httpError(400, "Prix d'achat invalide.").pipe(delay(NETWORK_DELAY_MS));

      lines.push({
        productId,
        productSku: product.sku,
        productName: product.name,
        quantity: qty,
        unitPurchasePrice: price,
        lineTotal: qty * price
      });
    }

    const totalAmount = lines.reduce((acc, l) => acc + l.lineTotal, 0);

    const created: PurchaseOrder = {
      id: `po_${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      lines,
      totalAmount,
      paidAmount: 0
    };

    mockPurchaseOrders = [created, ...mockPurchaseOrders];
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const id = url.split('/').pop() as string;
    const order = mockPurchaseOrders.find((o) => o.id === id);
    if (!order) return httpError(404, 'Commande introuvable.').pipe(delay(NETWORK_DELAY_MS));

    return of(jsonResponse(order)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+\/receive$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').slice(-2)[0] as string;
    const idx = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (idx === -1) return httpError(404, 'Commande introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const order = mockPurchaseOrders[idx];
    if (order.status !== 'PENDING') return httpError(400, 'Commande déjà livrée.').pipe(delay(NETWORK_DELAY_MS));

    const deliveredAt = new Date().toISOString();

    // Business rules:
    // - Update product stockQuantity (+qty)
    // - Update product purchasePrice to last received unit purchase price
    // - Create stock movements (SUPPLY)
    // - Append supplier purchase history
    order.lines.forEach((l) => {
      const pIdx = mockProducts.findIndex((p) => p.id === l.productId);
      if (pIdx === -1) return;

      const current = mockProducts[pIdx];
      const updated: Product = {
        ...current,
        stockQuantity: (current.stockQuantity ?? 0) + l.quantity,
        purchasePrice: l.unitPurchasePrice
      };
      mockProducts = mockProducts.map((p) => (p.id === updated.id ? updated : p));

      const movementId = `sm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      mockStockMovements = [
        {
          id: movementId,
          productId: l.productId,
          quantity: l.quantity,
          reason: 'SUPPLY',
          createdAt: deliveredAt,
          createdByUserId: user.id,
          note: `Réception ${order.id}`
        },
        ...mockStockMovements
      ];
    });

    mockSupplierPurchases = [
      {
        id: `sp_${Date.now()}`,
        supplierId: order.supplierId,
        purchaseDateIso: deliveredAt,
        reference: order.id,
        itemsCount: order.lines.reduce((acc, l) => acc + l.quantity, 0),
        totalAmount: order.totalAmount
      },
      ...mockSupplierPurchases
    ];

    const delivered: PurchaseOrder = { ...order, status: 'DELIVERED', deliveredAt };
    mockPurchaseOrders = mockPurchaseOrders.map((o) => (o.id === id ? delivered : o));

    return of(jsonResponse(delivered)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+\/invoice$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').slice(-2)[0] as string;
    const idx = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (idx === -1) return httpError(404, 'Commande introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const order = mockPurchaseOrders[idx];
    const body = (req.body ?? {}) as { invoiceNumber?: string; invoiceDateIso?: string };

    const invoiceNumber = String(body.invoiceNumber ?? '').trim();
    const invoiceDateIso = String(body.invoiceDateIso ?? '').trim();
    if (!invoiceNumber) return httpError(400, 'Numéro facture requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!invoiceDateIso) return httpError(400, 'Date facture requise.').pipe(delay(NETWORK_DELAY_MS));

    const invoice: SupplierInvoice = {
      invoiceNumber,
      invoiceDateIso,
      totalAmount: order.totalAmount
    };

    const updated: PurchaseOrder = { ...order, invoice };
    mockPurchaseOrders = mockPurchaseOrders.map((o) => (o.id === id ? updated : o));
    return of(jsonResponse(invoice, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+\/pay$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const orderId = url.split('/').slice(-2)[0] as string;
    const idx = mockPurchaseOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) return httpError(404, 'Commande introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const order = mockPurchaseOrders[idx];
    const body = (req.body ?? {}) as { amount?: number; paymentDateIso?: string; note?: string };

    const amount = Number(body.amount ?? 0);
    const paymentDateIso = String(body.paymentDateIso ?? '').trim();
    const note = body.note ? String(body.note).trim() : undefined;

    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(NETWORK_DELAY_MS));
    if (!paymentDateIso) return httpError(400, 'Date paiement requise.').pipe(delay(NETWORK_DELAY_MS));

    const remaining = Math.max(0, order.totalAmount - (order.paidAmount ?? 0));
    if (amount > remaining) return httpError(400, 'Montant supérieur au reste à payer.').pipe(delay(NETWORK_DELAY_MS));

    const updated: PurchaseOrder = { ...order, paidAmount: (order.paidAmount ?? 0) + amount };
    mockPurchaseOrders = mockPurchaseOrders.map((o) => (o.id === orderId ? updated : o));

    const payment: SupplierPayment = {
      id: `pay_${Date.now()}`,
      supplierId: order.supplierId,
      paymentDateIso,
      amount,
      orderId,
      note
    };

    mockSupplierPayments = [payment, ...mockSupplierPayments];
    return of(jsonResponse(updated)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Users (lecture simple)
  if (url.endsWith('/api/users') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    return of(jsonResponse({ items: mockUsers, total: mockUsers.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/users') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const input = req.body as Partial<User>;
    const username = String(input.username ?? '').trim();
    const fullName = String(input.fullName ?? '').trim();
    const roles = (input.roles ?? []) as Role[];

    if (!username) return httpError(400, 'Username requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!fullName) return httpError(400, 'Nom complet requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!Array.isArray(roles) || roles.length === 0) return httpError(400, 'Rôle requis.').pipe(delay(NETWORK_DELAY_MS));
    if (mockUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return httpError(400, 'Username déjà utilisé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const created: User = {
      id: `u_${Date.now()}`,
      username,
      fullName,
      phone: input.phone ? String(input.phone) : undefined,
      roles,
      isActive: input.isActive ?? true
    };

    (mockUsers as User[]).unshift(created);
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/users\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').pop() as string;
    const patch = req.body as Partial<User>;
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return httpError(404, 'Utilisateur introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const username = patch.username ? String(patch.username).trim() : mockUsers[idx].username;
    const fullName = patch.fullName ? String(patch.fullName).trim() : mockUsers[idx].fullName;
    const roles = (patch.roles ?? mockUsers[idx].roles) as Role[];

    if (!username) return httpError(400, 'Username requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!fullName) return httpError(400, 'Nom complet requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!Array.isArray(roles) || roles.length === 0) return httpError(400, 'Rôle requis.').pipe(delay(NETWORK_DELAY_MS));

    if (mockUsers.some((u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
      return httpError(400, 'Username déjà utilisé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const updated: User = {
      ...mockUsers[idx],
      ...patch,
      id,
      username,
      fullName,
      phone: patch.phone ? String(patch.phone) : mockUsers[idx].phone,
      roles
    };

    (mockUsers as User[]) = mockUsers.map((u) => (u.id === id ? updated : u));
    return of(jsonResponse(updated)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/users\/[^/]+\/active$/) && req.method === 'PATCH') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').slice(-2)[0] as string;
    const body = (req.body ?? {}) as { isActive?: boolean };
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return httpError(404, 'Utilisateur introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const updated: User = { ...mockUsers[idx], isActive: Boolean(body.isActive) };
    (mockUsers as User[]) = mockUsers.map((u) => (u.id === id ? updated : u));
    return of(jsonResponse(updated)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.match(/\/api\/users\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(NETWORK_DELAY_MS));
    }

    const id = url.split('/').pop() as string;
    (mockUsers as User[]) = mockUsers.filter((u) => u.id !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(NETWORK_DELAY_MS));
  }

  // Customers
  if (url.endsWith('/api/customers') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse({ items: mockCustomers, total: mockCustomers.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/customers') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const input = req.body as Partial<Customer>;
    const name = String(input.name ?? '').trim();
    if (!name) return httpError(400, 'Nom client requis.').pipe(delay(NETWORK_DELAY_MS));

    const created: Customer = {
      id: `c_${Date.now()}`,
      name,
      phone: input.phone ? String(input.phone) : undefined,
      email: input.email ? String(input.email) : undefined
    };

    mockCustomers = [created, ...mockCustomers];
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Stock movements
  if (url.endsWith('/api/stock/movements') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const from = req.params.get('from');
    const to = req.params.get('to');
    const productId = req.params.get('productId');

    const fromTs = from ? Date.parse(from) : Number.NaN;
    const toTs = to ? Date.parse(to) : Number.NaN;

    const items = mockStockMovements.filter((m) => {
      if (productId && m.productId !== productId) return false;

      const ts = Date.parse(m.createdAt);
      if (!Number.isNaN(fromTs) && ts < fromTs) return false;
      if (!Number.isNaN(toTs) && ts > toTs) return false;
      return true;
    });

    return of(jsonResponse({ items, total: items.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/stock/movements') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const input = req.body as Partial<StockMovement>;
    const productId = String(input.productId ?? '');
    const quantity = Number(input.quantity ?? 0);
    const reason = (input.reason ?? 'ADJUSTMENT') as StockMovement['reason'];

    if (!productId) return httpError(400, 'Produit requis.').pipe(delay(NETWORK_DELAY_MS));
    if (!Number.isFinite(quantity) || quantity === 0) {
      return httpError(400, 'Quantité invalide.').pipe(delay(NETWORK_DELAY_MS));
    }

    const product = mockProducts.find((p) => p.id === productId);
    if (!product) return httpError(404, 'Produit introuvable.').pipe(delay(NETWORK_DELAY_MS));

    const updatedQty = product.stockQuantity + quantity;
    if (updatedQty < 0) return httpError(400, 'Stock insuffisant.').pipe(delay(NETWORK_DELAY_MS));

    const movement: StockMovement = {
      id: `sm_${Date.now()}`,
      productId,
      quantity,
      reason,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
      note: input.note
    };

    // Update stock
    mockProducts = mockProducts.map((p) => (p.id === productId ? { ...p, stockQuantity: updatedQty } : p));

    // Add history
    mockStockMovements = [movement, ...mockStockMovements];

    return of(jsonResponse(movement, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Sales
  if (url.endsWith('/api/sales') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse({ items: mockSales, total: mockSales.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/sales') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const input = req.body as Partial<Sale>;

    const items = (input.items ?? []).map((it) => ({
      productId: String(it.productId ?? ''),
      quantity: Number(it.quantity ?? 0),
      unitPrice: Number(it.unitPrice ?? 0),
      purchasePrice: Number(it.purchasePrice ?? 0)
    }));

    if (items.length === 0) return httpError(400, 'Panier vide.').pipe(delay(NETWORK_DELAY_MS));
    if (items.some((it) => !it.productId || !Number.isFinite(it.quantity) || it.quantity <= 0)) {
      return httpError(400, 'Articles invalides.').pipe(delay(NETWORK_DELAY_MS));
    }

    const total = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    const profit = items.reduce((acc, it) => acc + (it.unitPrice - it.purchasePrice) * it.quantity, 0);

    // Stock validation
    for (const it of items) {
      const p = mockProducts.find((x) => x.id === it.productId);
      if (!p) return httpError(404, 'Produit introuvable.').pipe(delay(NETWORK_DELAY_MS));
      if (p.stockQuantity - it.quantity < 0) return httpError(400, 'Stock insuffisant.').pipe(delay(NETWORK_DELAY_MS));
    }

    const created: Sale = {
      id: `s_${Date.now()}`,
      type: (input.type ?? 'RETAIL') as Sale['type'],
      customerId: input.customerId,
      items: items as Sale['items'],
      paymentMethod: (input.paymentMethod ?? 'CASH') as Sale['paymentMethod'],
      total,
      profit,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id
    };

    // Apply stock & history
    for (const it of items) {
      const p = mockProducts.find((x) => x.id === it.productId) as Product;
      const newQty = p.stockQuantity - it.quantity;
      mockProducts = mockProducts.map((x) => (x.id === it.productId ? { ...x, stockQuantity: newQty } : x));

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
        productId: it.productId,
        quantity: -it.quantity,
        reason: 'SALE',
        createdAt: created.createdAt,
        createdByUserId: user.id,
        note: `Vente ${created.id}`
      };
      mockStockMovements = [movement, ...mockStockMovements];
    }

    mockSales = [created, ...mockSales];
    return of(jsonResponse(created, 201)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Appointments
  if (url.endsWith('/api/appointments') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));
    return of(jsonResponse({ items: mockAppointments, total: mockAppointments.length })).pipe(delay(NETWORK_DELAY_MS));
  }

  // Reports
  if (url.endsWith('/api/reports/daily') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const date = String(req.params.get('date') ?? new Date().toISOString().slice(0, 10));

    const report: DailyReport = {
      date,
      totalSales: mockSales.reduce((a, s) => a + s.total, 0),
      transactionsCount: mockSales.length,
      profit: mockSales.reduce((a, s) => a + s.profit, 0),
      expenses: 0,
      stockAlertsCount: mockProducts.filter((p) => p.stockQuantity <= p.alertThreshold).length
    };

    return of(jsonResponse(report)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/reports/monthly') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const month = String(req.params.get('month') ?? new Date().toISOString().slice(0, 7));

    const report: MonthlyReport = {
      month,
      totalSales: mockSales.reduce((a, s) => a + s.total, 0),
      profitNet: mockSales.reduce((a, s) => a + s.profit, 0),
      expenses: 0,
      lossCount: 0
    };

    return of(jsonResponse(report)).pipe(delay(NETWORK_DELAY_MS));
  }

  if (url.endsWith('/api/reports/yearly') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(NETWORK_DELAY_MS));

    const year = Number(req.params.get('year') ?? new Date().getFullYear());

    const report: YearlyReport = {
      year,
      totalSales: mockSales.reduce((a, s) => a + s.total, 0),
      profitNet: mockSales.reduce((a, s) => a + s.profit, 0),
      expenses: 0
    };

    return of(jsonResponse(report)).pipe(delay(NETWORK_DELAY_MS));
  }

  // Sinon, on laisse passer (utile si tu mixes mocks + vraie API plus tard)
  return next(req);
};
