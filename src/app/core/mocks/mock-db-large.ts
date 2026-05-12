/**
 * mock-db-large.ts
 * Générateur déterministe — 200 produits · 20 catégories · 15 fournisseurs ·
 * 50 clients · 100 commandes · 200 ventes · ~1 000 mouvements · 10 utilisateurs.
 * Seed fixe (20 251 225) → données reproductibles.
 */

import { Product }               from '../models/product.model';
import { User }                  from '../models/user.model';
import { Customer }              from '../models/customer.model';
import { Supplier }              from '../models/supplier.model';
import { Sale }                  from '../models/sale.model';
import { StockMovement }         from '../models/stock-movement.model';
import { PurchaseOrder }         from '../models/purchase-order.model';
import { Expense }               from '../models/expense.model';
import { CustomerPayment }       from '../models/customer-payment.model';
import { SupplierPayment }       from '../models/supplier-payment.model';
import { SupplierPurchaseHistory } from '../models/supplier-purchase-history.model';

// ─── RNG déterministe (LCG) ──────────────────────────────────────────────────
let _s = 20_251_225;
const rng = (): number => { _s = (Math.imul(_s ^ (_s >>> 16), 0x45d9f3b)); _s ^= _s >>> 16; return (_s >>> 0) / 4_294_967_295; };
const ri  = (a: number, b: number): number => Math.floor(rng() * (b - a + 1)) + a;
const pk  = <T>(a: readonly T[]): T => a[Math.floor(rng() * a.length)];
const zp  = (n: number, l = 3): string => String(n).padStart(l, '0');
const r500= (n: number): number => Math.round(n / 500) * 500;
const NOW = Date.now();
const dIso = (msAgo: number): string => new Date(NOW - msAgo).toISOString();
const rISO = (fromD: number, toD: number): string => dIso(ri(toD, fromD) * 86_400_000);
const rYMD = (fromD: number, toD: number): string => rISO(fromD, toD).slice(0, 10);

// ─── UTILISATEURS (10) ───────────────────────────────────────────────────────
export const LARGE_USERS: User[] = [
  { id:'u_01', username:'admin',        fullName:'Administrateur Système',  email:'admin@optique.ci',        roles:['ADMIN'],        isActive:true  },
  { id:'u_02', username:'diallo_m',     fullName:'Mamadou Diallo',          email:'diallo.m@optique.ci',     roles:['GESTIONNAIRE'], isActive:true  },
  { id:'u_03', username:'kouassi_a',    fullName:'Ama Kouassi',             email:'kouassi.a@optique.ci',    roles:['CAISSIER'],     isActive:true  },
  { id:'u_04', username:'bamba_s',      fullName:'Seydou Bamba',            email:'bamba.s@optique.ci',      roles:['CAISSIER'],     isActive:true  },
  { id:'u_05', username:'traore_f',     fullName:'Fatou Traoré',            email:'traore.f@optique.ci',     roles:['GESTIONNAIRE'], isActive:true  },
  { id:'u_06', username:'yao_k',        fullName:'Kouamé Yao',              email:'yao.k@optique.ci',        roles:['CAISSIER'],     isActive:true  },
  { id:'u_07', username:'coulibaly_n',  fullName:'Nafi Coulibaly',          email:'coulibaly.n@optique.ci',  roles:['ADMIN'],        isActive:true  },
  { id:'u_08', username:'kone_d',       fullName:'David Koné',              email:'kone.d@optique.ci',       roles:['CAISSIER'],     isActive:true  },
  { id:'u_09', username:'ouattara_i',   fullName:'Issa Ouattara',           email:'ouattara.i@optique.ci',   roles:['GESTIONNAIRE'], isActive:false },
  { id:'u_10', username:'assi_r',       fullName:'Rose Assi',               email:'assi.r@optique.ci',       roles:['CAISSIER'],     isActive:true  },
];

const USER_IDS = LARGE_USERS.map(u => u.id);

// ─── ENTREPÔTS (2) ────────────────────────────────────────────────────────────
export const LARGE_WAREHOUSES = [
  { id:'wh_1', name:'Magasin Central' },
  { id:'wh_2', name:'Dépôt Nord'      },
] as const;

// ─── CATÉGORIES (20) ─────────────────────────────────────────────────────────
export const LARGE_CATEGORIES = [
  { id:'c01', name:'Lunettes de vue'        }, { id:'c02', name:'Lunettes de soleil'    },
  { id:'c03', name:'Lentilles journalières' }, { id:'c04', name:'Lentilles mensuelles'  },
  { id:'c05', name:'Lentilles annuelles'    }, { id:'c06', name:'Solutions lentilles'   },
  { id:'c07', name:'Montures homme'         }, { id:'c08', name:'Montures femme'        },
  { id:'c09', name:'Montures enfant'        }, { id:'c10', name:'Montures sport'        },
  { id:'c11', name:'Verres simples'         }, { id:'c12', name:'Verres progressifs'    },
  { id:'c13', name:'Verres anti-reflets'    }, { id:'c14', name:'Verres photochromiques'},
  { id:'c15', name:'Étuis et protections'   }, { id:'c16', name:'Cordons et chaînes'   },
  { id:'c17', name:'Nettoyants optiques'    }, { id:'c18', name:'Loupes et instruments' },
  { id:'c19', name:'Matériel optométrie'    }, { id:'c20', name:'Accessoires divers'   },
];

// ─── FOURNISSEURS (15) ────────────────────────────────────────────────────────
export const LARGE_SUPPLIERS: Supplier[] = [
  { id:'sup_01', name:'Luxottica Group',           phone:'+39-02-8633',   email:'orders@luxottica.com',    address:'Milan, Italie',          deliveryLeadTimeDays:21 },
  { id:'sup_02', name:'Safilo Group',              phone:'+39-049-698',   email:'orders@safilo.com',       address:'Padoue, Italie',         deliveryLeadTimeDays:18 },
  { id:'sup_03', name:'Essilor International',     phone:'+33-1-4965',    email:'supplies@essilor.fr',     address:'Paris, France',          deliveryLeadTimeDays:14 },
  { id:'sup_04', name:'Alcon Laboratories',        phone:'+1-817-293',    email:'orders@alcon.com',        address:'Fort Worth, USA',        deliveryLeadTimeDays:30 },
  { id:'sup_05', name:'Johnson & Johnson Vision',  phone:'+1-800-843',    email:'vision@jnj.com',          address:'Jacksonville, USA',      deliveryLeadTimeDays:28 },
  { id:'sup_06', name:'CooperVision',              phone:'+44-1707-865',  email:'info@coopervision.com',   address:'Hatfield, Royaume-Uni',  deliveryLeadTimeDays:25 },
  { id:'sup_07', name:'Carl Zeiss Vision',         phone:'+49-7361-591',  email:'vision@zeiss.com',        address:'Oberkochen, Allemagne',  deliveryLeadTimeDays:20 },
  { id:'sup_08', name:'Hoya Vision Care',          phone:'+81-3-3273',    email:'orders@hoya.com',         address:'Tokyo, Japon',           deliveryLeadTimeDays:35 },
  { id:'sup_09', name:'Rodenstock GmbH',           phone:'+49-89-7202',   email:'info@rodenstock.com',     address:'Munich, Allemagne',      deliveryLeadTimeDays:22 },
  { id:'sup_10', name:'Marchon Eyewear',           phone:'+1-516-683',    email:'orders@marchon.com',      address:'New York, USA',          deliveryLeadTimeDays:28 },
  { id:'sup_11', name:'Silhouette International',  phone:'+43-732-3897',  email:'orders@silhouette.com',   address:'Linz, Autriche',         deliveryLeadTimeDays:24 },
  { id:'sup_12', name:'Nikon Lenswear',            phone:'+81-3-3348',    email:'lenswear@nikon.com',      address:'Tokyo, Japon',           deliveryLeadTimeDays:32 },
  { id:'sup_13', name:'Transitions Optical',       phone:'+1-727-545',    email:'orders@transitions.com',  address:'Pinellas Park, USA',     deliveryLeadTimeDays:20 },
  { id:'sup_14', name:'Optik Pro Distribution CI', phone:'+225-27-22-44', email:'ventes@optikpro.ci',      address:'Abidjan, Côte d\'Ivoire',deliveryLeadTimeDays:5  },
  { id:'sup_15', name:'AfriVision SARL',           phone:'+225-27-20-11', email:'commandes@afrivision.ci', address:'Abidjan, Côte d\'Ivoire',deliveryLeadTimeDays:3  },
];

// ─── PRODUITS (200) ──────────────────────────────────────────────────────────
const BRANDS   = ['Ray-Ban','Oakley','Alcon','Zeiss','Essilor','Hoya','Acuvue','Bausch+Lomb','Silhouette','Tom Ford','Gucci','Prada','Dior','Persol','Lindberg'];
const CAT_PFX: Record<string,string> = {
  c01:'Monture Vue', c02:'Lunette Soleil', c03:'Lentille Jour', c04:'Lentille Mois',
  c05:'Lentille An', c06:'Solution',       c07:'Monture H',    c08:'Monture F',
  c09:'Monture Kid', c10:'Sport Frame',    c11:'Verre Simple', c12:'Progressif',
  c13:'Anti-Reflet', c14:'Photochromique', c15:'Étui',         c16:'Cordon',
  c17:'Spray Optique',c18:'Loupe',         c19:'Équipement',   c20:'Accessoire',
};
const CAT_PRICE: [number,number][] = [
  [15_000,70_000],[10_000,55_000],[2_500,10_000],[4_000,18_000],[12_000,45_000],
  [1_200,6_000],[18_000,75_000],[18_000,75_000],[8_000,30_000],[20_000,90_000],
  [3_000,20_000],[25_000,110_000],[12_000,55_000],[20_000,75_000],[800,7_000],
  [300,4_500],[800,5_000],[2_500,25_000],[45_000,450_000],[400,8_000],
];
const CAT_SUPS: Record<string,string[]> = {
  c01:['sup_01','sup_02','sup_10','sup_11','sup_14'], c02:['sup_01','sup_02','sup_10','sup_14'],
  c03:['sup_04','sup_05','sup_06'],                   c04:['sup_04','sup_05','sup_06'],
  c05:['sup_04','sup_05','sup_06'],                   c06:['sup_04','sup_05','sup_14'],
  c07:['sup_01','sup_02','sup_11','sup_14'],          c08:['sup_01','sup_02','sup_11','sup_14'],
  c09:['sup_02','sup_10','sup_14'],                   c10:['sup_01','sup_02','sup_10','sup_14'],
  c11:['sup_03','sup_07','sup_08','sup_12'],          c12:['sup_03','sup_07','sup_08','sup_09'],
  c13:['sup_03','sup_07','sup_09','sup_12'],          c14:['sup_03','sup_13','sup_07'],
  c15:['sup_14','sup_15'],                            c16:['sup_14','sup_15'],
  c17:['sup_04','sup_14','sup_15'],                   c18:['sup_07','sup_14','sup_15'],
  c19:['sup_07','sup_09','sup_08','sup_14'],          c20:['sup_14','sup_15'],
};

const _stk: Record<string,number> = {};

export const LARGE_PRODUCTS: Product[] = Array.from({ length: 200 }, (_, i) => {
  const ci   = i % 20;
  const cat  = LARGE_CATEGORIES[ci];
  const [pMin, pMax] = CAT_PRICE[ci];
  const sup  = pk(CAT_SUPS[cat.id]);
  const pp   = r500(ri(pMin, pMax));
  const mrg  = cat.id === 'c19' ? rng() * 0.7 + 1.5 : rng() * 0.6 + 1.35;
  const mrg2 = cat.id === 'c19' ? rng() * 0.3 + 1.15 : rng() * 0.25 + 1.1;
  const id   = `p_${zp(i + 1)}`;
  _stk[id]   = 0;
  return {
    id,
    sku:           `SKU-${zp(i + 1, 4)}`,
    name:          `${CAT_PFX[cat.id]} ${BRANDS[i % BRANDS.length]} ${String.fromCharCode(65 + (i % 26))}${zp(i % 99 + 1, 2)}`,
    categoryId:    cat.id,
    categoryName:  cat.name,
    supplierId:    sup,
    purchasePrice: pp,
    retailPrice:   r500(pp * mrg),
    wholesalePrice:r500(pp * mrg2),
    stockQuantity: 0,
    alertThreshold: ri(3, 15),
  };
});

// ─── CLIENTS (50) ─────────────────────────────────────────────────────────────
const FN = ['Mamadou','Fatou','Ibrahim','Awa','Seydou','Aminata','Oumar','Mariam','Cheikh','Kadiatou',
  'Bakary','Binta','Adama','Coumba','Moussa','Rokhaya','Souleymane','Khady','Lamine','Astou',
  'Abdou','Ndeye','Thierno','Maimouna','Pape','Aissatou','Assane','Dieynaba','Modibo','Sira'];
const LN = ['Diallo','Bah','Barry','Koné','Traoré','Coulibaly','Kouyaté','Diaby','Camara','Touré',
  'Sylla','Baldé','Sow','Dieng','Fall','Seck','Ndiaye','Mbaye','Faye','Cissé',
  'Ouattara','Diabaté','Sidibé','Sangaré','Doumbia','Samaké','Dembélé','Keïta'];

export const LARGE_CUSTOMERS: Customer[] = Array.from({ length: 50 }, (_, i) => ({
  id:          `cl_${zp(i + 1)}`,
  name:        `${FN[i % FN.length]} ${LN[i % LN.length]}`,
  phone:       `+225 07 ${zp(ri(10,99),2)} ${zp(ri(10,99),2)} ${zp(ri(10,99),2)}`,
  email:       i % 3 !== 0 ? `${FN[i % FN.length].toLowerCase()}.${LN[i % LN.length].toLowerCase().replace(/ /g,'')}@mail.ci` : undefined,
  creditLimit: [0,0,50_000,100_000,200_000,500_000][ri(0,5)],
}));

// ─── COMMANDES FOURNISSEURS (100) + mouvements SUPPLY ────────────────────────
const _smvmts: StockMovement[]         = [];
const _spHist: SupplierPurchaseHistory[] = [];
const _spPay:  SupplierPayment[]       = [];

export const LARGE_PURCHASE_ORDERS: PurchaseOrder[] = Array.from({ length: 100 }, (_, i) => {
  const supplier   = LARGE_SUPPLIERS[i % LARGE_SUPPLIERS.length];
  const linesCount = ri(2, 4);
  const orderDaysAgo = ri(60, 540);
  const createdAt  = rISO(orderDaysAgo + 5, orderDaysAgo + 3);
  const isDelivered = orderDaysAgo > 30;
  const deliveredAt = isDelivered ? rISO(orderDaysAgo, orderDaysAgo - ri(3, supplier.deliveryLeadTimeDays)) : undefined;
  const userId = pk(USER_IDS.filter((_, j) => j < 5));
  const orderId = `po_${zp(i + 1)}`;

  const lines = Array.from({ length: linesCount }, (__, j) => {
    const prod = LARGE_PRODUCTS[(i * linesCount + j) % LARGE_PRODUCTS.length];
    const qty  = ri(20, 100);
    const uPrice = r500(prod.purchasePrice * (rng() * 0.1 + 0.92));
    if (isDelivered) {
      _stk[prod.id] = (_stk[prod.id] ?? 0) + qty;
      _smvmts.push({
        id: `sm_s${zp(i * 4 + j + 1, 4)}`,
        productId: prod.id,
        quantity:  qty,
        reason:    'SUPPLY',
        createdAt: deliveredAt!,
        createdByUserId: userId,
        note: `Réception commande ${orderId}`,
      });
    }
    return {
      productId: prod.id, productSku: prod.sku, productName: prod.name,
      quantity: qty, unitPurchasePrice: uPrice, lineTotal: uPrice * qty,
    };
  });

  const totalAmount = lines.reduce((a, l) => a + l.lineTotal, 0);
  const paidAmount  = isDelivered ? (rng() > 0.25 ? totalAmount : r500(totalAmount * (rng() * 0.5 + 0.3))) : 0;

  if (isDelivered) {
    _spHist.push({
      id: `sph_${zp(i + 1)}`, supplierId: supplier.id,
      purchaseDateIso: deliveredAt!.slice(0, 10), reference: orderId,
      itemsCount: lines.reduce((a, l) => a + l.quantity, 0), totalAmount,
    });
    if (paidAmount > 0) {
      _spPay.push({
        id: `spv_${zp(i + 1)}`, supplierId: supplier.id,
        paymentDateIso: rYMD(orderDaysAgo - 1, Math.max(orderDaysAgo - 20, 1)),
        amount: paidAmount, orderId,
        note: `Paiement commande ${orderId}`,
      });
    }
  }

  return {
    id: orderId, supplierId: supplier.id, supplierName: supplier.name,
    status: isDelivered ? 'DELIVERED' : 'PENDING',
    createdAt, deliveredAt, lines, totalAmount, paidAmount,
  };
});

// ─── VENTES (200) — cohérentes avec le stock ─────────────────────────────────
const PMETHODS: Sale['paymentMethod'][] = ['CASH','CASH','CASH','MOBILE_MONEY','BANK_TRANSFER'];
const _cpay: CustomerPayment[] = [];

export const LARGE_SALES: Sale[] = (() => {
  const sales: Sale[] = [];
  const eligibleProds = () => LARGE_PRODUCTS.filter(p => (_stk[p.id] ?? 0) > 0);

  for (let i = 0; i < 200; i++) {
    const avail = eligibleProds();
    if (avail.length === 0) break;
    const saleType   = rng() > 0.25 ? 'RETAIL' : 'WHOLESALE';
    const nItems     = Math.min(ri(1, 4), avail.length);
    const saleId     = `sa_${zp(i + 1)}`;
    const createdAt  = rISO(90, 0);
    const userId     = pk(USER_IDS.filter((_, j) => j >= 2 && j <= 7));
    const useCustomer= rng() > 0.35;
    const customer   = useCustomer ? LARGE_CUSTOMERS[ri(0, LARGE_CUSTOMERS.length - 1)] : undefined;

    const selected = new Set<number>();
    while (selected.size < nItems) selected.add(ri(0, avail.length - 1));

    const items = [...selected].map(idx => {
      const prod  = avail[idx];
      const maxQty= Math.min(_stk[prod.id], ri(1, 5));
      const qty   = Math.max(1, maxQty);
      const uPrice= saleType === 'RETAIL' ? prod.retailPrice : prod.wholesalePrice;
      _stk[prod.id] -= qty;
      _smvmts.push({
        id: `sm_v${zp(i * 4 + idx + 1, 4)}`,
        productId: prod.id, quantity: -qty, reason: 'SALE',
        createdAt, createdByUserId: userId,
        note: `Vente ${saleId}`,
      });
      return { productId: prod.id, quantity: qty, unitPrice: uPrice, purchasePrice: prod.purchasePrice };
    });

    const total   = items.reduce((a, it) => a + it.unitPrice * it.quantity, 0);
    const profit  = items.reduce((a, it) => a + (it.unitPrice - it.purchasePrice) * it.quantity, 0);
    const method  = pk(PMETHODS);
    const isCredit= customer && rng() > 0.65 && (customer.creditLimit ?? 0) > 0;
    const paid    = isCredit ? r500(total * (rng() * 0.5 + 0.3)) : total;

    if (isCredit && customer && total - paid > 0 && rng() > 0.5) {
      _cpay.push({
        id: `cp_${zp(i + 1)}`, customerId: customer.id,
        paymentDateIso: rYMD(ri(1, 30), 0),
        amount: r500((total - paid) * (rng() * 0.5 + 0.4)),
        note: `Paiement partiel vente ${saleId}`,
      });
    }

    sales.push({
      id: saleId, type: saleType, customerId: customer?.id,
      items: items as Sale['items'], paymentMethod: method,
      paidAmount: paid, total, profit, createdAt, createdByUserId: userId,
    });
  }
  return sales;
})();

// ─── MOUVEMENTS SUPPLÉMENTAIRES (AJUSTEMENT / PERTE) ────────────────────────
const ADJ_NOTES = ['Correction inventaire','Casse transport','Perte magasin','Ajustement entrepôt','Retour client','Démarque inconnue'];
for (let i = 0; i < 200; i++) {
  const prod  = LARGE_PRODUCTS[i % LARGE_PRODUCTS.length];
  const isAdj = rng() > 0.4;
  const qty   = ri(1, 5) * (isAdj ? 1 : -1);
  if (!isAdj && (_stk[prod.id] ?? 0) + qty < 0) continue;
  if (!isAdj) _stk[prod.id] = (_stk[prod.id] ?? 0) + qty;
  if (isAdj)  _stk[prod.id] = (_stk[prod.id] ?? 0) + qty;
  _smvmts.push({
    id: `sm_a${zp(i + 1, 4)}`,
    productId: prod.id, quantity: qty,
    reason: isAdj ? 'ADJUSTMENT' : 'LOSS',
    createdAt: rISO(365, 0), createdByUserId: pk(USER_IDS),
    note: pk(ADJ_NOTES),
  });
}

export const LARGE_STOCK_MOVEMENTS: StockMovement[] = _smvmts
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

// ─── Mise à jour des stockQuantity produits ───────────────────────────────────
LARGE_PRODUCTS.forEach(p => { p.stockQuantity = Math.max(0, _stk[p.id] ?? 0); });

// ─── DÉPENSES (50) ───────────────────────────────────────────────────────────
const EXP_DATA: [string, string, number, number][] = [
  ['Loyer',        'Loyer mensuel boutique',       120_000, 180_000],
  ['Loyer',        'Loyer dépôt Nord',              60_000,  90_000],
  ['Électricité',  'Facture CIE mensuelle',          15_000,  35_000],
  ['Eau',          'Facture SODECI',                  3_000,   8_000],
  ['Salaires',     'Salaires personnel mois',       500_000, 900_000],
  ['Transport',    'Livraison fournisseurs',          10_000,  40_000],
  ['Marketing',    'Publicité réseaux sociaux',       15_000,  50_000],
  ['Maintenance',  'Réparation équipements',          5_000,  30_000],
  ['Fournitures',  'Matériel bureau et caisse',       3_000,  12_000],
  ['Internet',     'Abonnement fibre mensuel',        15_000,  25_000],
];

export const LARGE_EXPENSES: Expense[] = Array.from({ length: 50 }, (_, i) => {
  const [cat, lbl, mn, mx] = EXP_DATA[i % EXP_DATA.length];
  const dt = rYMD(365, 0);
  return {
    id:               `exp_${zp(i + 1)}`,
    category:         cat,
    label:            lbl,
    amount:           r500(ri(mn, mx)),
    expenseDateIso:   dt,
    createdAt:        dt + 'T08:00:00.000Z',
    createdByUserId:  pk(USER_IDS.filter((_, j) => j < 3)),
    note:             i % 5 === 0 ? 'Payé en espèces' : undefined,
  };
});

// ─── EXPORTS PAIEMENTS ────────────────────────────────────────────────────────
export const LARGE_CUSTOMER_PAYMENTS: CustomerPayment[] = _cpay;
export const LARGE_SUPPLIER_PAYMENTS: SupplierPayment[]  = _spPay;
export const LARGE_SUPPLIER_HISTORY: SupplierPurchaseHistory[] = _spHist;

// ─── STATISTIQUES DASHBOARD ──────────────────────────────────────────────────
const todayKey = new Date().toISOString().slice(0, 10);
const todaySales = LARGE_SALES.filter(s => s.createdAt.slice(0, 10) === todayKey);

export const LARGE_DASHBOARD_STATS = {
  totalProducts:      LARGE_PRODUCTS.length,
  totalCustomers:     LARGE_CUSTOMERS.length,
  totalSuppliers:     LARGE_SUPPLIERS.length,
  totalSales:         LARGE_SALES.length,
  totalPurchaseOrders:LARGE_PURCHASE_ORDERS.length,
  totalStockMovements:LARGE_STOCK_MOVEMENTS.length,
  globalStockTotal:   LARGE_PRODUCTS.reduce((a, p) => a + p.stockQuantity, 0),
  globalStockValue:   LARGE_PRODUCTS.reduce((a, p) => a + p.stockQuantity * p.purchasePrice, 0),
  pendingOrders:      LARGE_PURCHASE_ORDERS.filter(o => o.status === 'PENDING').length,
  stockAlerts:        LARGE_PRODUCTS.filter(p => p.stockQuantity <= p.alertThreshold).length,
  totalRevenue:       LARGE_SALES.reduce((a, s) => a + s.total, 0),
  totalProfit:        LARGE_SALES.reduce((a, s) => a + s.profit, 0),
  totalExpenses:      LARGE_EXPENSES.reduce((a, e) => a + e.amount, 0),
  todaySalesTotal:    todaySales.reduce((a, s) => a + s.total, 0),
  todayProfit:        todaySales.reduce((a, s) => a + s.profit, 0),
  netProfit: LARGE_SALES.reduce((a, s) => a + s.profit, 0) - LARGE_EXPENSES.reduce((a, e) => a + e.amount, 0),
} as const;
