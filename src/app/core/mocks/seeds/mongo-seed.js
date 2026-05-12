/**
 * mongo-seed.js
 * Seed MongoDB avec les données réalistes du projet gestion-stock.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/gestion_stock" mongo-seed.js
 *
 * Ou avec mongoimport (par collection) :
 *   node -e "require('./mongo-seed').exportJson()" | mongoimport ...
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function daysAgo(n, hour = 9) {
  return new Date(Date.now() - n * 86_400_000 - (9 - hour) * 3_600_000);
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 86_400_000);
}
function ObjectId(id) {
  return id; // En dev on utilise les string IDs
}

// ─────────────────────────────────────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────────────────────────────────────

const warehouses = [
  { _id: 'wh_1', name: 'Magasin Principal',  address: 'Boulevard VGE, Cocody, Abidjan', isActive: true, createdAt: daysAgo(180) },
  { _id: 'wh_2', name: 'Dépôt Secondaire',   address: 'Zone Industrielle, Yopougon, Abidjan', isActive: true, createdAt: daysAgo(180) }
];

const categories = [
  { _id: 'cat_1', name: 'Montures',                slug: 'montures',   createdAt: daysAgo(180) },
  { _id: 'cat_2', name: 'Verres correcteurs',       slug: 'verres',     createdAt: daysAgo(180) },
  { _id: 'cat_3', name: 'Lentilles de contact',     slug: 'lentilles',  createdAt: daysAgo(180) },
  { _id: 'cat_4', name: 'Accessoires',              slug: 'accessoires',createdAt: daysAgo(180) },
  { _id: 'cat_5', name: "Solutions d'entretien",    slug: 'solutions',  createdAt: daysAgo(180) }
];

const users = [
  { _id: 'u_admin',    username: 'admin',    fullName: 'Moussa Konaté',  email: 'admin@optivision.ci',    phone: '+225 07 00 00 01', passwordHash: '$2b$10$DEMO_HASH', roles: ['ADMIN'],       isActive: true, magasin: 'Magasin Principal', createdAt: daysAgo(180) },
  { _id: 'u_mgr',      username: 'marie_k',  fullName: 'Marie Koné',     email: 'marie.k@optivision.ci',  phone: '+225 07 00 00 02', passwordHash: '$2b$10$DEMO_HASH', roles: ['GESTIONNAIRE'],isActive: true, magasin: 'Magasin Principal', createdAt: daysAgo(150) },
  { _id: 'u_cashier',  username: 'pierre_d', fullName: 'Pierre Diallo',  email: 'pierre.d@optivision.ci', phone: '+225 07 00 00 03', passwordHash: '$2b$10$DEMO_HASH', roles: ['CAISSIER'],    isActive: true, magasin: 'Magasin Principal', createdAt: daysAgo(120) },
  { _id: 'u_cashier2', username: 'fatou_s',  fullName: 'Fatou Sow',      email: 'fatou.s@optivision.ci',  phone: '+225 07 00 00 04', passwordHash: '$2b$10$DEMO_HASH', roles: ['CAISSIER'],    isActive: true, magasin: 'Dépôt Secondaire',  createdAt: daysAgo(90) }
];

const suppliers = [
  { _id: 'sup_1', name: 'Essilor Distribution CI',         phone: '+225 20 25 00 10', email: 'commandes@essilor.ci',       address: 'Zone Ind. Yopougon, Abidjan', deliveryLeadTimeDays: 5,  createdAt: daysAgo(180) },
  { _id: 'sup_2', name: "Luxottica Afrique de l'Ouest",    phone: '+225 20 31 44 00', email: 'orders@luxottica-aow.com',    address: 'Plateau, Abidjan',             deliveryLeadTimeDays: 10, createdAt: daysAgo(180) },
  { _id: 'sup_3', name: 'CooperVision Afrique',            phone: '+225 22 47 80 00', email: 'supply@coopervision.ci',      address: 'Marcory, Abidjan',             deliveryLeadTimeDays: 7,  createdAt: daysAgo(180) },
  { _id: 'sup_4', name: 'Transitions Optical',             phone: '+225 20 56 12 30', email: 'orders@transitions.ci',       address: 'Koumassi, Abidjan',            deliveryLeadTimeDays: 12, createdAt: daysAgo(180) },
  { _id: 'sup_5', name: 'Alcon Laboratoires CI',           phone: '+225 20 33 90 00', email: 'alcon@alcon.ci',              address: 'Cocody, Abidjan',              deliveryLeadTimeDays: 8,  createdAt: daysAgo(180) }
];

const products = [
  { _id: 'p_1',  sku: 'MON-RB3025',  name: 'Monture Ray-Ban RB3025',           categoryId: 'cat_1', supplierId: 'sup_2', purchasePrice: 15000, retailPrice: 35000, wholesalePrice: 28000, alertThreshold: 3,  createdAt: daysAgo(180) },
  { _id: 'p_2',  sku: 'MON-OX8046',  name: 'Monture Oakley OX8046',            categoryId: 'cat_1', supplierId: 'sup_2', purchasePrice: 18000, retailPrice: 42000, wholesalePrice: 34000, alertThreshold: 3,  createdAt: daysAgo(180) },
  { _id: 'p_3',  sku: 'MON-GEN-F',   name: 'Monture Générique Femme',          categoryId: 'cat_1', supplierId: 'sup_2', purchasePrice:  5000, retailPrice: 15000, wholesalePrice: 12000, alertThreshold: 5,  createdAt: daysAgo(180) },
  { _id: 'p_4',  sku: 'MON-ENF-S',   name: 'Monture Enfant Sport',             categoryId: 'cat_1', supplierId: 'sup_2', purchasePrice:  4500, retailPrice: 12000, wholesalePrice:  9500, alertThreshold: 4,  createdAt: daysAgo(180) },
  { _id: 'p_5',  sku: 'VER-UNI-SP',  name: 'Verre Unifocal Sphérique',         categoryId: 'cat_2', supplierId: 'sup_1', purchasePrice:  3500, retailPrice:  8000, wholesalePrice:  6500, alertThreshold: 10, createdAt: daysAgo(180) },
  { _id: 'p_6',  sku: 'VER-PRO-PM',  name: 'Verre Progressif Premium',         categoryId: 'cat_2', supplierId: 'sup_1', purchasePrice: 12000, retailPrice: 28000, wholesalePrice: 23000, alertThreshold: 5,  createdAt: daysAgo(180) },
  { _id: 'p_7',  sku: 'VER-AR-BC',   name: 'Verre Antireflet Bluecut',         categoryId: 'cat_2', supplierId: 'sup_1', purchasePrice:  8000, retailPrice: 18000, wholesalePrice: 15000, alertThreshold: 5,  createdAt: daysAgo(180) },
  { _id: 'p_8',  sku: 'VER-PHC-TR',  name: 'Verre Photochromique Transitions', categoryId: 'cat_2', supplierId: 'sup_4', purchasePrice: 14000, retailPrice: 32000, wholesalePrice: 26000, alertThreshold: 4,  createdAt: daysAgo(180) },
  { _id: 'p_9',  sku: 'LEN-MEN-CV',  name: 'Lentilles Mensuelles CooperVision',categoryId: 'cat_3', supplierId: 'sup_3', purchasePrice:  4500, retailPrice: 10000, wholesalePrice:  8500, alertThreshold: 10, createdAt: daysAgo(180) },
  { _id: 'p_10', sku: 'LEN-JOU-CV',  name: 'Lentilles Journalières (boîte 30)',categoryId: 'cat_3', supplierId: 'sup_3', purchasePrice:  3000, retailPrice:  7000, wholesalePrice:  6000, alertThreshold: 15, createdAt: daysAgo(180) },
  { _id: 'p_11', sku: 'LEN-COL-AL',  name: 'Lentilles Colorées Alcon',         categoryId: 'cat_3', supplierId: 'sup_5', purchasePrice:  5000, retailPrice: 12000, wholesalePrice: 10000, alertThreshold: 8,  createdAt: daysAgo(180) },
  { _id: 'p_12', sku: 'ACC-ETU-RIG', name: 'Étui lunettes rigide',             categoryId: 'cat_4', supplierId: 'sup_2', purchasePrice:   500, retailPrice:  1500, wholesalePrice:  1200, alertThreshold: 20, createdAt: daysAgo(180) },
  { _id: 'p_13', sku: 'ACC-MCF-X',   name: 'Chiffon microfibre',               categoryId: 'cat_4', supplierId: 'sup_1', purchasePrice:   200, retailPrice:   700, wholesalePrice:   550, alertThreshold: 30, createdAt: daysAgo(180) },
  { _id: 'p_14', sku: 'SOL-MUL-360', name: 'Solution multifonction 360ml Alcon',categoryId:'cat_5', supplierId: 'sup_5', purchasePrice:  2500, retailPrice:  5500, wholesalePrice:  4500, alertThreshold: 15, createdAt: daysAgo(180) },
  { _id: 'p_15', sku: 'SOL-SAL-250', name: 'Solution saline 250ml',            categoryId: 'cat_5', supplierId: 'sup_5', purchasePrice:  1200, retailPrice:  3000, wholesalePrice:  2500, alertThreshold: 20, createdAt: daysAgo(180) }
];

const warehouse_stocks = [
  { _id: 'ws_p1_wh1',  warehouseId: 'wh_1', productId: 'p_1',  quantity: 12 },
  { _id: 'ws_p2_wh1',  warehouseId: 'wh_1', productId: 'p_2',  quantity:  8 },
  { _id: 'ws_p3_wh1',  warehouseId: 'wh_1', productId: 'p_3',  quantity: 15 },
  { _id: 'ws_p4_wh1',  warehouseId: 'wh_1', productId: 'p_4',  quantity: 10 },
  { _id: 'ws_p5_wh1',  warehouseId: 'wh_1', productId: 'p_5',  quantity: 55 },
  { _id: 'ws_p6_wh1',  warehouseId: 'wh_1', productId: 'p_6',  quantity: 23 },
  { _id: 'ws_p7_wh1',  warehouseId: 'wh_1', productId: 'p_7',  quantity: 30 },
  { _id: 'ws_p8_wh1',  warehouseId: 'wh_1', productId: 'p_8',  quantity:  7 },
  { _id: 'ws_p9_wh1',  warehouseId: 'wh_1', productId: 'p_9',  quantity: 22 },
  { _id: 'ws_p10_wh1', warehouseId: 'wh_1', productId: 'p_10', quantity: 50 },
  { _id: 'ws_p11_wh1', warehouseId: 'wh_1', productId: 'p_11', quantity: 18 },
  { _id: 'ws_p12_wh1', warehouseId: 'wh_1', productId: 'p_12', quantity: 25 },
  { _id: 'ws_p13_wh1', warehouseId: 'wh_1', productId: 'p_13', quantity: 38 },
  { _id: 'ws_p14_wh1', warehouseId: 'wh_1', productId: 'p_14', quantity: 20 },
  { _id: 'ws_p15_wh1', warehouseId: 'wh_1', productId: 'p_15', quantity: 28 },
  { _id: 'ws_p1_wh2',  warehouseId: 'wh_2', productId: 'p_1',  quantity:  6 },
  { _id: 'ws_p2_wh2',  warehouseId: 'wh_2', productId: 'p_2',  quantity:  4 },
  { _id: 'ws_p3_wh2',  warehouseId: 'wh_2', productId: 'p_3',  quantity:  8 },
  { _id: 'ws_p4_wh2',  warehouseId: 'wh_2', productId: 'p_4',  quantity:  5 },
  { _id: 'ws_p5_wh2',  warehouseId: 'wh_2', productId: 'p_5',  quantity: 17 },
  { _id: 'ws_p6_wh2',  warehouseId: 'wh_2', productId: 'p_6',  quantity: 10 },
  { _id: 'ws_p7_wh2',  warehouseId: 'wh_2', productId: 'p_7',  quantity: 14 },
  { _id: 'ws_p8_wh2',  warehouseId: 'wh_2', productId: 'p_8',  quantity:  5 },
  { _id: 'ws_p9_wh2',  warehouseId: 'wh_2', productId: 'p_9',  quantity: 12 },
  { _id: 'ws_p10_wh2', warehouseId: 'wh_2', productId: 'p_10', quantity: 22 },
  { _id: 'ws_p12_wh2', warehouseId: 'wh_2', productId: 'p_12', quantity: 14 },
  { _id: 'ws_p13_wh2', warehouseId: 'wh_2', productId: 'p_13', quantity: 18 },
  { _id: 'ws_p14_wh2', warehouseId: 'wh_2', productId: 'p_14', quantity: 10 },
  { _id: 'ws_p15_wh2', warehouseId: 'wh_2', productId: 'p_15', quantity: 14 }
];

const customers = [
  { _id: 'c_1',  name: 'Aminata Traoré',       phone: '+225 05 10 20 30', email: 'aminata.t@gmail.com',     creditLimit:         0, balance: 0,       createdAt: daysAgo(120) },
  { _id: 'c_2',  name: 'Optique Pro Dakar',    phone: '+221 33 820 00 01', email: 'achats@optiquepro.sn',    creditLimit:   200_000, balance: 60_000,  createdAt: daysAgo(150) },
  { _id: 'c_3',  name: 'Kouadio Jean-Pierre',  phone: '+225 05 55 44 33', email: 'kj.pierre@yahoo.fr',      creditLimit:    50_000, balance: 9_500,   createdAt: daysAgo(90)  },
  { _id: 'c_4',  name: 'Clinique Vision Plus', phone: '+225 20 21 00 55', email: 'vision.plus@clinique.ci', creditLimit:   500_000, balance: 129_000, createdAt: daysAgo(180) },
  { _id: 'c_5',  name: 'Ibrahim Coulibaly',    phone: '+225 07 77 88 99', email: '',                         creditLimit:         0, balance: 0,       createdAt: daysAgo(60)  },
  { _id: 'c_6',  name: 'Mariam Bamba',         phone: '+225 05 34 56 78', email: 'mariam.b@gmail.com',       creditLimit:    30_000, balance: 9_500,   createdAt: daysAgo(80)  },
  { _id: 'c_7',  name: 'Grossiste Abidjan SA', phone: '+225 20 33 44 55', email: 'achats@grossiste-abi.ci',  creditLimit: 1_000_000, balance: 0,       createdAt: daysAgo(180) },
  { _id: 'c_8',  name: 'Yves Aka',             phone: '+225 07 11 22 33', email: 'yves.aka@email.com',       creditLimit:         0, balance: 0,       createdAt: daysAgo(45)  },
  { _id: 'c_9',  name: 'Nadia Ouédraogo',      phone: '+226 70 11 22 33', email: 'nadia.o@email.bf',         creditLimit:    75_000, balance: 0,       createdAt: daysAgo(70)  },
  { _id: 'c_10', name: 'Centre Médical Cocody', phone: '+225 22 44 00 88', email: 'medecin@cmc.ci',          creditLimit:   300_000, balance: 0,       createdAt: daysAgo(10)  }
];

const purchase_orders = [
  { _id: 'po_1', supplierId: 'sup_1', supplierName: 'Essilor Distribution CI', status: 'DELIVERED', warehouseId: 'wh_1', createdAt: daysAgo(88), deliveredAt: daysAgo(82), lines: [{ productId: 'p_5', productSku: 'VER-UNI-SP', productName: 'Verre Unifocal Sphérique', quantity: 50, unitPurchasePrice: 3500, lineTotal: 175000 }, { productId: 'p_6', productSku: 'VER-PRO-PM', productName: 'Verre Progressif Premium', quantity: 20, unitPurchasePrice: 12000, lineTotal: 240000 }, { productId: 'p_7', productSku: 'VER-AR-BC', productName: 'Verre Antireflet Bluecut', quantity: 25, unitPurchasePrice: 8000, lineTotal: 200000 }, { productId: 'p_13', productSku: 'ACC-MCF-X', productName: 'Chiffon microfibre', quantity: 80, unitPurchasePrice: 200, lineTotal: 16000 }], totalAmount: 631000, paidAmount: 631000, invoice: { invoiceNumber: 'ESS-2026-001', invoiceDateIso: daysAgo(84), totalAmount: 631000 } },
  { _id: 'po_2', supplierId: 'sup_2', supplierName: "Luxottica Afrique de l'Ouest", status: 'DELIVERED', warehouseId: 'wh_1', createdAt: daysAgo(85), deliveredAt: daysAgo(78), lines: [{ productId: 'p_1', productSku: 'MON-RB3025', productName: 'Monture Ray-Ban RB3025', quantity: 20, unitPurchasePrice: 15000, lineTotal: 300000 }, { productId: 'p_2', productSku: 'MON-OX8046', productName: 'Monture Oakley OX8046', quantity: 15, unitPurchasePrice: 18000, lineTotal: 270000 }, { productId: 'p_3', productSku: 'MON-GEN-F', productName: 'Monture Générique Femme', quantity: 25, unitPurchasePrice: 5000, lineTotal: 125000 }, { productId: 'p_12', productSku: 'ACC-ETU-RIG', productName: 'Étui lunettes rigide', quantity: 50, unitPurchasePrice: 500, lineTotal: 25000 }], totalAmount: 720000, paidAmount: 720000, invoice: { invoiceNumber: 'LUX-2026-010', invoiceDateIso: daysAgo(80), totalAmount: 720000 } },
  { _id: 'po_7', supplierId: 'sup_3', supplierName: 'CooperVision Afrique',       status: 'DELIVERED', warehouseId: 'wh_1', createdAt: daysAgo(28), deliveredAt: daysAgo(22), lines: [{ productId: 'p_9', productSku: 'LEN-MEN-CV', productName: 'Lentilles Mensuelles', quantity: 40, unitPurchasePrice: 4500, lineTotal: 180000 }, { productId: 'p_10', productSku: 'LEN-JOU-CV', productName: 'Lentilles Journalières', quantity: 80, unitPurchasePrice: 3000, lineTotal: 240000 }], totalAmount: 420000, paidAmount: 210000, invoice: { invoiceNumber: 'CV-2026-011', invoiceDateIso: daysAgo(24), totalAmount: 420000 } },
  { _id: 'po_8', supplierId: 'sup_2', supplierName: "Luxottica Afrique de l'Ouest", status: 'PENDING', warehouseId: 'wh_1', createdAt: daysAgo(5), lines: [{ productId: 'p_1', productSku: 'MON-RB3025', productName: 'Monture Ray-Ban RB3025', quantity: 15, unitPurchasePrice: 15000, lineTotal: 225000 }, { productId: 'p_4', productSku: 'MON-ENF-S', productName: 'Monture Enfant Sport', quantity: 20, unitPurchasePrice: 4500, lineTotal: 90000 }, { productId: 'p_12', productSku: 'ACC-ETU-RIG', productName: 'Étui lunettes rigide', quantity: 50, unitPurchasePrice: 500, lineTotal: 25000 }], totalAmount: 340000, paidAmount: 0 }
];

const sales = [
  { _id: 's_01', type: 'RETAIL',    customerId: 'c_1',  warehouseId: 'wh_1', items: [{ productId: 'p_3', quantity: 1, unitPrice: 15000, purchasePrice: 5000 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_13', quantity: 1, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount:  31700, total:  31700, profit: 18700, createdAt: daysAgo(85), createdByUserId: 'u_cashier'  },
  { _id: 's_02', type: 'WHOLESALE', customerId: 'c_7',  warehouseId: 'wh_1', items: [{ productId: 'p_5', quantity: 10, unitPrice: 6500, purchasePrice: 3500 }, { productId: 'p_7', quantity: 6, unitPrice: 15000, purchasePrice: 8000 }, { productId: 'p_12', quantity: 10, unitPrice: 1200, purchasePrice: 500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 167000, total: 167000, profit: 84000, createdAt: daysAgo(82), createdByUserId: 'u_cashier'  },
  { _id: 's_07', type: 'WHOLESALE', customerId: 'c_4',  warehouseId: 'wh_1', items: [{ productId: 'p_6', quantity: 4, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_8', quantity: 2, unitPrice: 26000, purchasePrice: 14000 }, { productId: 'p_9', quantity: 5, unitPrice: 8500, purchasePrice: 4500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 186500, total: 186500, profit: 83000, createdAt: daysAgo(58), createdByUserId: 'u_cashier2' },
  { _id: 's_10', type: 'WHOLESALE', customerId: 'c_2',  warehouseId: 'wh_1', items: [{ productId: 'p_10', quantity: 15, unitPrice: 6000, purchasePrice: 3000 }, { productId: 'p_11', quantity: 6, unitPrice: 10000, purchasePrice: 5000 }, { productId: 'p_14', quantity: 8, unitPrice: 4500, purchasePrice: 2500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 126000, total: 186000, profit: 76000, createdAt: daysAgo(50), createdByUserId: 'u_cashier2' },
  { _id: 's_21', type: 'RETAIL',    customerId: 'c_1',  warehouseId: 'wh_1', items: [{ productId: 'p_1', quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_13', quantity: 2, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount:  52400, total:  52400, profit: 29400, createdAt: daysAgo(5),  createdByUserId: 'u_cashier'  },
  { _id: 's_22', type: 'WHOLESALE', customerId: 'c_4',  warehouseId: 'wh_1', items: [{ productId: 'p_6', quantity: 3, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_7', quantity: 4, unitPrice: 15000, purchasePrice: 8000 }], paymentMethod: 'BANK_TRANSFER', paidAmount:       0, total: 129000, profit: 61000, createdAt: daysAgo(4),  createdByUserId: 'u_cashier2' },
  { _id: 's_25', type: 'RETAIL',    customerId: 'c_8',  warehouseId: 'wh_1', items: [{ productId: 'p_10', quantity: 5, unitPrice: 7000, purchasePrice: 3000 }, { productId: 'p_12', quantity: 2, unitPrice: 1500, purchasePrice: 500 }], paymentMethod: 'CASH',          paidAmount:  38000, total:  38000, profit: 22000, createdAt: daysAgo(1),  createdByUserId: 'u_cashier'  }
];

const stock_movements = [
  { _id: 'sm_01', warehouseId: 'wh_1', productId: 'p_5',  quantity:  50, reason: 'SUPPLY',     note: 'Réception PO-001', createdAt: daysAgo(82), createdByUserId: 'u_mgr' },
  { _id: 'sm_02', warehouseId: 'wh_1', productId: 'p_6',  quantity:  20, reason: 'SUPPLY',     note: 'Réception PO-001', createdAt: daysAgo(82), createdByUserId: 'u_mgr' },
  { _id: 'sm_05', warehouseId: 'wh_1', productId: 'p_1',  quantity:  20, reason: 'SUPPLY',     note: 'Réception PO-002', createdAt: daysAgo(78), createdByUserId: 'u_mgr' },
  { _id: 'sm_11', warehouseId: 'wh_1', productId: 'p_5',  quantity:  -2, reason: 'SALE',       note: 'Vente s_01',       createdAt: daysAgo(85), createdByUserId: 'u_cashier' },
  { _id: 'sm_12', warehouseId: 'wh_1', productId: 'p_5',  quantity: -10, reason: 'SALE',       note: 'Vente s_02',       createdAt: daysAgo(82), createdByUserId: 'u_cashier' },
  { _id: 'sm_16', warehouseId: 'wh_1', productId: 'p_13', quantity:  -4, reason: 'LOSS',       note: 'Chiffons abîmés',  createdAt: daysAgo(63), createdByUserId: 'u_mgr' },
  { _id: 'sm_18', warehouseId: 'wh_1', productId: 'p_13', quantity:  -2, reason: 'ADJUSTMENT', note: 'Inventaire Inv-001',createdAt: daysAgo(20), createdByUserId: 'u_mgr' },
  { _id: 'sm_19', warehouseId: 'wh_1', productId: 'p_10', quantity: -10, reason: 'ADJUSTMENT', note: 'Transfert → wh_2', createdAt: daysAgo(15), createdByUserId: 'u_mgr' },
  { _id: 'sm_20', warehouseId: 'wh_2', productId: 'p_10', quantity:  10, reason: 'ADJUSTMENT', note: 'Transfert ← wh_1', createdAt: daysAgo(15), createdByUserId: 'u_mgr' }
];

const expenses = [
  { _id: 'exp_1',  category: 'loyer',       label: 'Loyer boutique – Février 2026',     amount: 150000, expenseDateIso: '2026-02-01', createdAt: daysAgo(98), createdByUserId: 'u_admin' },
  { _id: 'exp_2',  category: 'salaires',    label: 'Salaires personnel – Février 2026', amount: 320000, expenseDateIso: '2026-02-28', createdAt: daysAgo(70), createdByUserId: 'u_admin' },
  { _id: 'exp_3',  category: 'transport',   label: 'Carburant véhicule livraison',       amount:  18500, expenseDateIso: '2026-03-05', createdAt: daysAgo(67), createdByUserId: 'u_mgr'   },
  { _id: 'exp_4',  category: 'loyer',       label: 'Loyer boutique – Mars 2026',        amount: 150000, expenseDateIso: '2026-03-01', createdAt: daysAgo(66), createdByUserId: 'u_admin' },
  { _id: 'exp_5',  category: 'electricite', label: 'Facture électricité – Mars',        amount:  42000, expenseDateIso: '2026-03-15', createdAt: daysAgo(57), createdByUserId: 'u_admin' },
  { _id: 'exp_6',  category: 'salaires',    label: 'Salaires personnel – Mars 2026',    amount: 320000, expenseDateIso: '2026-03-31', createdAt: daysAgo(41), createdByUserId: 'u_admin' },
  { _id: 'exp_7',  category: 'transport',   label: 'Taxi course livraison client',       amount:   3500, expenseDateIso: '2026-04-08', createdAt: daysAgo(33), createdByUserId: 'u_cashier' },
  { _id: 'exp_8',  category: 'loyer',       label: 'Loyer boutique – Avril 2026',       amount: 150000, expenseDateIso: '2026-04-01', createdAt: daysAgo(40), createdByUserId: 'u_admin' },
  { _id: 'exp_9',  category: 'maintenance', label: 'Réparation climatiseur boutique',   amount:  35000, expenseDateIso: '2026-04-20', createdAt: daysAgo(21), createdByUserId: 'u_admin' },
  { _id: 'exp_10', category: 'electricite', label: 'Facture électricité – Avril',       amount:  38500, expenseDateIso: '2026-04-30', createdAt: daysAgo(11), createdByUserId: 'u_admin' }
];

const appointments = [
  { _id: 'apt_1', customerName: 'Aminata Traoré',       phone: '+225 05 10 20 30', dateTime: daysFromNow(0.1), status: 'SCHEDULED', note: 'Contrôle de vue annuel' },
  { _id: 'apt_2', customerName: 'Kouadio Jean-Pierre',  phone: '+225 05 55 44 33', dateTime: daysFromNow(1),   status: 'SCHEDULED', note: 'Retrait commande montures' },
  { _id: 'apt_3', customerName: 'Nadia Ouédraogo',      phone: '+226 70 11 22 33', dateTime: daysFromNow(2),   status: 'SCHEDULED', note: 'Essayage lentilles colorées' },
  { _id: 'apt_5', customerName: 'Mariam Bamba',         phone: '+225 05 34 56 78', dateTime: daysAgo(1),       status: 'COMPLETED', note: 'Livraison verres progressifs' },
  { _id: 'apt_6', customerName: 'Ibrahim Coulibaly',    phone: '+225 07 77 88 99', dateTime: daysAgo(2),       status: 'COMPLETED', note: 'Adaptation lentilles' }
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed function (mongosh)
// ─────────────────────────────────────────────────────────────────────────────
function seed(db) {
  const collections = {
    warehouses, categories, users, suppliers, products,
    warehouse_stocks, customers, purchase_orders,
    sales, stock_movements, expenses, appointments
  };

  for (const [name, docs] of Object.entries(collections)) {
    db[name].drop();
    if (docs.length > 0) db[name].insertMany(docs);
    print(`✓ ${name}: ${docs.length} documents insérés`);
  }

  // Index de performance
  db.products.createIndex({ categoryId: 1 });
  db.products.createIndex({ supplierId: 1 });
  db.products.createIndex({ sku: 1 }, { unique: true });
  db.warehouse_stocks.createIndex({ warehouseId: 1, productId: 1 }, { unique: true });
  db.sales.createIndex({ createdAt: -1 });
  db.sales.createIndex({ customerId: 1 });
  db.sales.createIndex({ warehouseId: 1 });
  db.stock_movements.createIndex({ productId: 1, createdAt: -1 });
  db.stock_movements.createIndex({ warehouseId: 1, createdAt: -1 });
  db.purchase_orders.createIndex({ status: 1 });
  db.purchase_orders.createIndex({ supplierId: 1 });
  db.customers.createIndex({ name: 'text' });
  db.expenses.createIndex({ expenseDateIso: -1 });
  db.appointments.createIndex({ dateTime: 1 });
  print('✓ Indexes créés');
  print('');
  print('=== Seed terminé avec succès ===');
  print(`Base: gestion_stock`);
  print(`Produits: ${products.length} | Ventes: ${sales.length} | Commandes: ${purchase_orders.length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point (mongosh context)
// ─────────────────────────────────────────────────────────────────────────────
if (typeof db !== 'undefined') {
  seed(db);
} else {
  // Node.js context – export des données JSON
  module.exports = {
    warehouses, categories, users, suppliers, products,
    warehouse_stocks, customers, purchase_orders,
    sales, stock_movements, expenses, appointments
  };
}
