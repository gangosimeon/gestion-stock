import { User } from '../models/user.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Warehouse } from '../models/warehouse.model';
import { Supplier } from '../models/supplier.model';
import { SupplierPurchaseHistory } from '../models/supplier-purchase-history.model';
import { SupplierPayment } from '../models/supplier-payment.model';
import { Customer } from '../models/customer.model';
import { CustomerPayment } from '../models/customer-payment.model';
import { Sale } from '../models/sale.model';
import { PurchaseOrder } from '../models/purchase-order.model';
import { StockMovement } from '../models/stock-movement.model';
import { Expense } from '../models/expense.model';
import { Appointment } from '../models/appointment.model';

// ─── Helpers ────────────────────────────────────────────────────────────────
const d = (daysAgo: number, h = 9): string =>
  new Date(Date.now() - daysAgo * 86_400_000 - (h === 9 ? 0 : (9 - h) * 3_600_000)).toISOString();
const iso = (s: string): string => new Date(s).toISOString();
const today = (h: number, m = 0): string => { const n = new Date(); n.setHours(h, m, 0, 0); return n.toISOString(); };

// ─── Warehouses ─────────────────────────────────────────────────────────────
export const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'wh_1', name: 'Magasin Principal' },
  { id: 'wh_2', name: 'Dépôt Secondaire' }
];

// ─── Categories ─────────────────────────────────────────────────────────────
export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Montures' },
  { id: 'cat_2', name: 'Verres correcteurs' },
  { id: 'cat_3', name: 'Lentilles de contact' },
  { id: 'cat_4', name: 'Accessoires' },
  { id: 'cat_5', name: "Solutions d'entretien" }
];

// ─── Users ───────────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  {
    id: 'u_admin',
    username: 'admin',
    fullName: 'Moussa Konaté',
    email: 'admin@optivision.ci',
    phone: '+225 07 00 00 01',
    roles: ['ADMIN'],
    role: 'ADMIN',
    isActive: true,
    magasin: 'Magasin Principal',
    avatar: ''
  },
  {
    id: 'u_mgr',
    username: 'marie_k',
    fullName: 'Marie Koné',
    email: 'marie.k@optivision.ci',
    phone: '+225 07 00 00 02',
    roles: ['GESTIONNAIRE'],
    role: 'MANAGER',
    isActive: true,
    magasin: 'Magasin Principal',
    avatar: ''
  },
  {
    id: 'u_cashier',
    username: 'pierre_d',
    fullName: 'Pierre Diallo',
    email: 'pierre.d@optivision.ci',
    phone: '+225 07 00 00 03',
    roles: ['CAISSIER'],
    role: 'EMPLOYEE',
    isActive: true,
    magasin: 'Magasin Principal',
    avatar: ''
  },
  {
    id: 'u_cashier2',
    username: 'fatou_s',
    fullName: 'Fatou Sow',
    email: 'fatou.s@optivision.ci',
    phone: '+225 07 00 00 04',
    roles: ['CAISSIER'],
    role: 'EMPLOYEE',
    isActive: true,
    magasin: 'Dépôt Secondaire',
    avatar: ''
  }
];

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup_1', name: 'Essilor Distribution CI', phone: '+225 20 25 00 10', email: 'commandes@essilor.ci', address: 'Zone Ind. Yopougon, Abidjan', deliveryLeadTimeDays: 5 },
  { id: 'sup_2', name: 'Luxottica Afrique de l\'Ouest', phone: '+225 20 31 44 00', email: 'orders@luxottica-aow.com', address: 'Plateau, Abidjan', deliveryLeadTimeDays: 10 },
  { id: 'sup_3', name: 'CooperVision Afrique', phone: '+225 22 47 80 00', email: 'supply@coopervision.ci', address: 'Marcory, Abidjan', deliveryLeadTimeDays: 7 },
  { id: 'sup_4', name: 'Transitions Optical', phone: '+225 20 56 12 30', email: 'orders@transitions.ci', address: 'Koumassi, Abidjan', deliveryLeadTimeDays: 12 },
  { id: 'sup_5', name: 'Alcon Laboratoires CI', phone: '+225 20 33 90 00', email: 'alcon@alcon.ci', address: 'Cocody, Abidjan', deliveryLeadTimeDays: 8 }
];

// ─── Products ────────────────────────────────────────────────────────────────
export const MOCK_PRODUCTS: Product[] = [
  { id: 'p_1', sku: 'MON-RB3025', name: 'Monture Ray-Ban RB3025', categoryId: 'cat_1', categoryName: 'Montures', supplierId: 'sup_2', purchasePrice: 15000, retailPrice: 35000, wholesalePrice: 28000, stockQuantity: 12, alertThreshold: 3 },
  { id: 'p_2', sku: 'MON-OX8046', name: 'Monture Oakley OX8046', categoryId: 'cat_1', categoryName: 'Montures', supplierId: 'sup_2', purchasePrice: 18000, retailPrice: 42000, wholesalePrice: 34000, stockQuantity: 8, alertThreshold: 3 },
  { id: 'p_3', sku: 'MON-GEN-F', name: 'Monture Générique Femme', categoryId: 'cat_1', categoryName: 'Montures', supplierId: 'sup_2', purchasePrice: 5000, retailPrice: 15000, wholesalePrice: 12000, stockQuantity: 15, alertThreshold: 5 },
  { id: 'p_4', sku: 'MON-ENF-S', name: 'Monture Enfant Sport', categoryId: 'cat_1', categoryName: 'Montures', supplierId: 'sup_2', purchasePrice: 4500, retailPrice: 12000, wholesalePrice: 9500, stockQuantity: 10, alertThreshold: 4 },
  { id: 'p_5', sku: 'VER-UNI-SP', name: 'Verre Unifocal Sphérique', categoryId: 'cat_2', categoryName: 'Verres correcteurs', supplierId: 'sup_1', purchasePrice: 3500, retailPrice: 8000, wholesalePrice: 6500, stockQuantity: 55, alertThreshold: 10 },
  { id: 'p_6', sku: 'VER-PRO-PM', name: 'Verre Progressif Premium', categoryId: 'cat_2', categoryName: 'Verres correcteurs', supplierId: 'sup_1', purchasePrice: 12000, retailPrice: 28000, wholesalePrice: 23000, stockQuantity: 23, alertThreshold: 5 },
  { id: 'p_7', sku: 'VER-AR-BC', name: 'Verre Antireflet Bluecut', categoryId: 'cat_2', categoryName: 'Verres correcteurs', supplierId: 'sup_1', purchasePrice: 8000, retailPrice: 18000, wholesalePrice: 15000, stockQuantity: 30, alertThreshold: 5 },
  { id: 'p_8', sku: 'VER-PHC-TR', name: 'Verre Photochromique Transitions', categoryId: 'cat_2', categoryName: 'Verres correcteurs', supplierId: 'sup_4', purchasePrice: 14000, retailPrice: 32000, wholesalePrice: 26000, stockQuantity: 7, alertThreshold: 4 },
  { id: 'p_9', sku: 'LEN-MEN-CV', name: 'Lentilles Mensuelles CooperVision', categoryId: 'cat_3', categoryName: 'Lentilles de contact', supplierId: 'sup_3', purchasePrice: 4500, retailPrice: 10000, wholesalePrice: 8500, stockQuantity: 22, alertThreshold: 10 },
  { id: 'p_10', sku: 'LEN-JOU-CV', name: 'Lentilles Journalières (boîte 30)', categoryId: 'cat_3', categoryName: 'Lentilles de contact', supplierId: 'sup_3', purchasePrice: 3000, retailPrice: 7000, wholesalePrice: 6000, stockQuantity: 50, alertThreshold: 15 },
  { id: 'p_11', sku: 'LEN-COL-AL', name: 'Lentilles Colorées Alcon', categoryId: 'cat_3', categoryName: 'Lentilles de contact', supplierId: 'sup_5', purchasePrice: 5000, retailPrice: 12000, wholesalePrice: 10000, stockQuantity: 18, alertThreshold: 8 },
  { id: 'p_12', sku: 'ACC-ETU-RIG', name: 'Étui lunettes rigide', categoryId: 'cat_4', categoryName: 'Accessoires', supplierId: 'sup_2', purchasePrice: 500, retailPrice: 1500, wholesalePrice: 1200, stockQuantity: 25, alertThreshold: 20 },
  { id: 'p_13', sku: 'ACC-MCF-X', name: 'Chiffon microfibre', categoryId: 'cat_4', categoryName: 'Accessoires', supplierId: 'sup_1', purchasePrice: 200, retailPrice: 700, wholesalePrice: 550, stockQuantity: 38, alertThreshold: 30 },
  { id: 'p_14', sku: 'SOL-MUL-360', name: 'Solution multifonction 360ml Alcon', categoryId: 'cat_5', categoryName: "Solutions d'entretien", supplierId: 'sup_5', purchasePrice: 2500, retailPrice: 5500, wholesalePrice: 4500, stockQuantity: 20, alertThreshold: 15 },
  { id: 'p_15', sku: 'SOL-SAL-250', name: 'Solution saline 250ml', categoryId: 'cat_5', categoryName: "Solutions d'entretien", supplierId: 'sup_5', purchasePrice: 1200, retailPrice: 3000, wholesalePrice: 2500, stockQuantity: 28, alertThreshold: 20 },
  // ── Nouveaux produits ────────────────────────────────────────────────────
  { id: 'p_16', sku: 'MON-TF5823',  name: 'Monture Tom Ford TF5823',             categoryId: 'cat_1', categoryName: 'Montures',                 supplierId: 'sup_2', purchasePrice: 22000, retailPrice: 55000, wholesalePrice: 44000, stockQuantity: 8,  alertThreshold: 2  },
  { id: 'p_17', sku: 'MON-RAB-AV',  name: 'Monture Ray-Ban Aviator Classic',    categoryId: 'cat_1', categoryName: 'Montures',                 supplierId: 'sup_2', purchasePrice: 18000, retailPrice: 45000, wholesalePrice: 36000, stockQuantity: 5,  alertThreshold: 2  },
  { id: 'p_18', sku: 'MON-SIL-TI',  name: 'Monture Silhouette Titan Rimless',   categoryId: 'cat_1', categoryName: 'Montures',                 supplierId: 'sup_2', purchasePrice: 35000, retailPrice: 85000, wholesalePrice: 68000, stockQuantity: 3,  alertThreshold: 1  },
  { id: 'p_19', sku: 'MON-ENF-FL',  name: 'Monture Enfant Flex TR90',           categoryId: 'cat_1', categoryName: 'Montures',                 supplierId: 'sup_2', purchasePrice: 4000,  retailPrice: 10000, wholesalePrice: 8000,  stockQuantity: 12, alertThreshold: 5  },
  { id: 'p_20', sku: 'MON-HOM-MT',  name: 'Monture Homme Métal Premium',        categoryId: 'cat_1', categoryName: 'Montures',                 supplierId: 'sup_2', purchasePrice: 8000,  retailPrice: 22000, wholesalePrice: 18000, stockQuantity: 9,  alertThreshold: 3  },
  { id: 'p_21', sku: 'VER-BIF-STD', name: 'Verre Bifocal Standard',             categoryId: 'cat_2', categoryName: 'Verres correcteurs',       supplierId: 'sup_1', purchasePrice: 6000,  retailPrice: 14000, wholesalePrice: 11500, stockQuantity: 30, alertThreshold: 8  },
  { id: 'p_22', sku: 'VER-174-ULT', name: 'Verre Ultra-Mince 1.74',             categoryId: 'cat_2', categoryName: 'Verres correcteurs',       supplierId: 'sup_1', purchasePrice: 18000, retailPrice: 42000, wholesalePrice: 34000, stockQuantity: 15, alertThreshold: 4  },
  { id: 'p_23', sku: 'VER-AR-CRIZ', name: 'Verre AR Crizal Essilor',            categoryId: 'cat_2', categoryName: 'Verres correcteurs',       supplierId: 'sup_1', purchasePrice: 15000, retailPrice: 36000, wholesalePrice: 29000, stockQuantity: 20, alertThreshold: 5  },
  { id: 'p_24', sku: 'VER-SOL-POL', name: 'Verre Solaire Polarisé',             categoryId: 'cat_2', categoryName: 'Verres correcteurs',       supplierId: 'sup_1', purchasePrice: 10000, retailPrice: 24000, wholesalePrice: 19500, stockQuantity: 12, alertThreshold: 4  },
  { id: 'p_25', sku: 'VER-HC-PROG', name: 'Verre Haute Correction Progressive', categoryId: 'cat_2', categoryName: 'Verres correcteurs',       supplierId: 'sup_4', purchasePrice: 20000, retailPrice: 48000, wholesalePrice: 38000, stockQuantity: 8,  alertThreshold: 3  },
  { id: 'p_26', sku: 'LEN-TOR-CV',  name: 'Lentilles Toriques Astig CooperV',   categoryId: 'cat_3', categoryName: 'Lentilles de contact',     supplierId: 'sup_3', purchasePrice: 5500,  retailPrice: 12500, wholesalePrice: 10500, stockQuantity: 25, alertThreshold: 8  },
  { id: 'p_27', sku: 'LEN-MUL-CV',  name: 'Lentilles Multifocal Presbytie',    categoryId: 'cat_3', categoryName: 'Lentilles de contact',     supplierId: 'sup_3', purchasePrice: 6500,  retailPrice: 15000, wholesalePrice: 12000, stockQuantity: 18, alertThreshold: 6  },
  { id: 'p_28', sku: 'LEN-SP-ACU',  name: 'Lentilles Sport Acuvue Oasys',      categoryId: 'cat_3', categoryName: 'Lentilles de contact',     supplierId: 'sup_5', purchasePrice: 7000,  retailPrice: 16000, wholesalePrice: 13000, stockQuantity: 22, alertThreshold: 8  },
  { id: 'p_29', sku: 'ACC-COR-SIL', name: 'Cordon anti-perte Silicone',         categoryId: 'cat_4', categoryName: 'Accessoires',              supplierId: 'sup_2', purchasePrice: 300,   retailPrice: 1000,  wholesalePrice: 800,   stockQuantity: 45, alertThreshold: 25 },
  { id: 'p_30', sku: 'ACC-KIT-RPA', name: 'Kit réparation lunettes',            categoryId: 'cat_4', categoryName: 'Accessoires',              supplierId: 'sup_2', purchasePrice: 700,   retailPrice: 2500,  wholesalePrice: 2000,  stockQuantity: 15, alertThreshold: 10 },
  { id: 'p_31', sku: 'SOL-SAL-500', name: 'Solution saline stérile 500ml',      categoryId: 'cat_5', categoryName: "Solutions d'entretien",   supplierId: 'sup_5', purchasePrice: 2000,  retailPrice: 4500,  wholesalePrice: 3800,  stockQuantity: 30, alertThreshold: 15 },
  { id: 'p_32', sku: 'SOL-PERO-CC', name: 'Clear Care solution peroxyde 360ml', categoryId: 'cat_5', categoryName: "Solutions d'entretien",   supplierId: 'sup_5', purchasePrice: 3500,  retailPrice: 8000,  wholesalePrice: 6500,  stockQuantity: 10, alertThreshold: 8  },
  { id: 'p_33', sku: 'ACC-SPR-100', name: 'Spray nettoyant lunettes 100ml',     categoryId: 'cat_4', categoryName: 'Accessoires',              supplierId: 'sup_1', purchasePrice: 800,   retailPrice: 2200,  wholesalePrice: 1800,  stockQuantity: 35, alertThreshold: 20 },
  { id: 'p_34', sku: 'ACC-LPE-250', name: 'Loupe lecture +2.5 dioptre',         categoryId: 'cat_4', categoryName: 'Accessoires',              supplierId: 'sup_1', purchasePrice: 1500,  retailPrice: 4500,  wholesalePrice: 3500,  stockQuantity: 20, alertThreshold: 8  },
  { id: 'p_35', sku: 'ACC-VIS-COR', name: 'Visserie remplacement monture',      categoryId: 'cat_4', categoryName: 'Accessoires',              supplierId: 'sup_2', purchasePrice: 200,   retailPrice: 800,   wholesalePrice: 600,   stockQuantity: 25, alertThreshold: 20 }
];

// ─── Warehouse Stocks (état actuel cohérent avec l'historique) ───────────────
export const MOCK_WAREHOUSE_STOCKS: Record<string, Record<string, number>> = {
  wh_1: { p_1: 12, p_2: 8,  p_3: 15, p_4: 10, p_5: 55, p_6: 23, p_7: 30, p_8: 7,  p_9: 22, p_10: 50, p_11: 18, p_12: 25, p_13: 38, p_14: 20, p_15: 28, p_16: 8, p_17: 5, p_18: 3, p_19: 12, p_20: 9, p_21: 30, p_22: 15, p_23: 20, p_24: 12, p_25: 8, p_26: 25, p_27: 18, p_28: 22, p_29: 45, p_30: 15, p_31: 30, p_32: 10, p_33: 35, p_34: 20, p_35: 25 },
  wh_2: { p_1: 6,  p_2: 4,  p_3: 8,  p_4: 5,  p_5: 17, p_6: 10, p_7: 14, p_8: 5,  p_9: 12, p_10: 22, p_11: 0,  p_12: 14, p_13: 18, p_14: 10, p_15: 14, p_16: 3, p_17: 2, p_18: 1, p_19: 5,  p_20: 4, p_21: 10, p_22: 5,  p_23: 7,  p_24: 4,  p_25: 3, p_26: 10, p_27: 6,  p_28: 8,  p_29: 20, p_30: 6,  p_31: 12, p_32: 4,  p_33: 15, p_34: 8,  p_35: 10 }
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c_1',  name: 'Aminata Traoré',      phone: '+225 05 10 20 30', email: 'aminata.t@gmail.com',    creditLimit: 0 },
  { id: 'c_2',  name: 'Optique Pro Dakar',   phone: '+221 33 820 00 01', email: 'achats@optiquepro.sn',   creditLimit: 200_000 },
  { id: 'c_3',  name: 'Kouadio Jean-Pierre',  phone: '+225 05 55 44 33', email: 'kj.pierre@yahoo.fr',     creditLimit: 50_000 },
  { id: 'c_4',  name: 'Clinique Vision Plus', phone: '+225 20 21 00 55', email: 'vision.plus@clinique.ci', creditLimit: 500_000 },
  { id: 'c_5',  name: 'Ibrahim Coulibaly',    phone: '+225 07 77 88 99', email: '',                        creditLimit: 0 },
  { id: 'c_6',  name: 'Mariam Bamba',         phone: '+225 05 34 56 78', email: 'mariam.b@gmail.com',      creditLimit: 30_000 },
  { id: 'c_7',  name: 'Grossiste Abidjan SA', phone: '+225 20 33 44 55', email: 'achats@grossiste-abi.ci', creditLimit: 1_000_000 },
  { id: 'c_8',  name: 'Yves Aka',             phone: '+225 07 11 22 33', email: 'yves.aka@email.com',      creditLimit: 0 },
  { id: 'c_9',  name: 'Nadia Ouédraogo',      phone: '+226 70 11 22 33', email: 'nadia.o@email.bf',        creditLimit: 75_000 },
  { id: 'c_10', name: 'Centre Médical Cocody',     phone: '+225 22 44 00 88', email: 'medecin@cmc.ci',              creditLimit: 300_000 },
  { id: 'c_11', name: 'Opticiens Réunis SA',       phone: '+225 20 22 33 44', email: 'achats@opticiens-reunis.ci',  creditLimit: 750_000 },
  { id: 'c_12', name: 'Soumaila Koné',             phone: '+225 07 55 66 77', email: 'soumaila.k@yahoo.fr',         creditLimit: 0 },
  { id: 'c_13', name: "Hôpital Général d'Abobo",  phone: '+225 20 38 10 20', email: 'commandes@hga.ci',            creditLimit: 1_500_000 },
  { id: 'c_14', name: 'Adjoua Diomandé',           phone: '+225 05 77 88 12', email: '',                            creditLimit: 0 },
  { id: 'c_15', name: 'Association Voir Mieux CI', phone: '+225 22 47 50 00', email: 'contact@voirmieux.ci',        creditLimit: 400_000 }
];

// ─── Customer Payments ────────────────────────────────────────────────────────
export const MOCK_CUSTOMER_PAYMENTS: CustomerPayment[] = [
  { id: 'cp_1', customerId: 'c_2',  paymentDateIso: d(25), amount: 50_000,  note: 'Acompte commande groupée' },
  { id: 'cp_2', customerId: 'c_4',  paymentDateIso: d(18), amount: 100_000, note: 'Règlement facture F-042' },
  { id: 'cp_3', customerId: 'c_7',  paymentDateIso: d(12), amount: 200_000, note: 'Virement bancaire reçu' },
  { id: 'cp_4', customerId: 'c_3',  paymentDateIso: d(8),  amount: 25_000,  note: 'Espèces' },
  { id: 'cp_5', customerId: 'c_9',  paymentDateIso: d(5),  amount: 30_000,  note: 'Mobile Money' },
  { id: 'cp_6', customerId: 'c_4',  paymentDateIso: d(3),  amount: 150_000, note: 'Règlement partiel' },
  { id: 'cp_7',  customerId: 'c_2',  paymentDateIso: d(1),   amount: 80_000,  note: 'Solde dû' },
  { id: 'cp_8',  customerId: 'c_11', paymentDateIso: d(10),  amount: 200_000, note: 'Acompte commande trimestrielle' },
  { id: 'cp_9',  customerId: 'c_13', paymentDateIso: d(8),   amount: 500_000, note: 'Virement bancaire mensuel' },
  { id: 'cp_10', customerId: 'c_4',  paymentDateIso: d(6),   amount: 129_000, note: 'Règlement vente s_22' },
  { id: 'cp_11', customerId: 'c_15', paymentDateIso: d(14),  amount: 150_000, note: 'Règlement partiel commande' },
  { id: 'cp_12', customerId: 'c_13', paymentDateIso: d(20),  amount: 330_000, note: 'Règlement vente s_40' },
  { id: 'cp_13', customerId: 'c_7',  paymentDateIso: d(35),  amount: 144_000, note: 'Virement pour commande grossiste' },
  { id: 'cp_14', customerId: 'c_11', paymentDateIso: d(45),  amount: 100_000, note: 'Acompte sur commande' }
];

// ─── Sales ────────────────────────────────────────────────────────────────────
export const MOCK_SALES: Sale[] = [
  // ── Mois -3 ──────────────────────────────────────────────────────────────────
  { id: 's_01', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_3', quantity: 1, unitPrice: 15000, purchasePrice: 5000 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_13', quantity: 1, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount: 31700,  total: 31700,  profit: 18700, createdAt: d(85), createdByUserId: 'u_cashier' },
  { id: 's_02', type: 'WHOLESALE', customerId: 'c_7',  items: [{ productId: 'p_5', quantity: 10, unitPrice: 6500, purchasePrice: 3500 }, { productId: 'p_7', quantity: 6, unitPrice: 15000, purchasePrice: 8000 }, { productId: 'p_12', quantity: 10, unitPrice: 1200, purchasePrice: 500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 167000, total: 167000, profit: 84000, createdAt: d(82), createdByUserId: 'u_cashier' },
  { id: 's_03', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_1', quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_7', quantity: 2, unitPrice: 18000, purchasePrice: 8000 }, { productId: 'p_13', quantity: 2, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount: 72400,  total: 72400,  profit: 41400, createdAt: d(79), createdByUserId: 'u_cashier2' },
  { id: 's_04', type: 'RETAIL',    customerId: 'c_3',  items: [{ productId: 'p_6', quantity: 1, unitPrice: 28000, purchasePrice: 12000 }, { productId: 'p_9', quantity: 1, unitPrice: 10000, purchasePrice: 4500 }, { productId: 'p_14', quantity: 1, unitPrice: 5500, purchasePrice: 2500 }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 43500,  total: 43500,  profit: 24500, createdAt: d(76), createdByUserId: 'u_cashier' },
  { id: 's_05', type: 'RETAIL',    customerId: 'c_6',  items: [{ productId: 'p_4', quantity: 1, unitPrice: 12000, purchasePrice: 4500 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_12', quantity: 1, unitPrice: 1500, purchasePrice: 500 }], paymentMethod: 'CASH',          paidAmount: 20000,  total: 29500,  profit: 19500, createdAt: d(73), createdByUserId: 'u_cashier2' },
  // ── Mois -2 ──────────────────────────────────────────────────────────────────
  { id: 's_06', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_8', quantity: 1, unitPrice: 32000, purchasePrice: 14000 }, { productId: 'p_7', quantity: 2, unitPrice: 18000, purchasePrice: 8000 }, { productId: 'p_13', quantity: 1, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount: 68700,  total: 68700,  profit: 36700, createdAt: d(60), createdByUserId: 'u_cashier' },
  { id: 's_07', type: 'WHOLESALE', customerId: 'c_4',  items: [{ productId: 'p_6', quantity: 4, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_8', quantity: 2, unitPrice: 26000, purchasePrice: 14000 }, { productId: 'p_9', quantity: 5, unitPrice: 8500, purchasePrice: 4500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 186500, total: 186500, profit: 83000, createdAt: d(58), createdByUserId: 'u_cashier2' },
  { id: 's_08', type: 'RETAIL',    customerId: 'c_5',  items: [{ productId: 'p_10', quantity: 3, unitPrice: 7000, purchasePrice: 3000 }, { productId: 'p_15', quantity: 2, unitPrice: 3000, purchasePrice: 1200 }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 27000,  total: 27000,  profit: 14400, createdAt: d(55), createdByUserId: 'u_cashier' },
  { id: 's_09', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_2', quantity: 1, unitPrice: 42000, purchasePrice: 18000 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_12', quantity: 1, unitPrice: 1500, purchasePrice: 500 }], paymentMethod: 'CASH',          paidAmount: 59500,  total: 59500,  profit: 33500, createdAt: d(52), createdByUserId: 'u_cashier' },
  { id: 's_10', type: 'WHOLESALE', customerId: 'c_2',  items: [{ productId: 'p_10', quantity: 15, unitPrice: 6000, purchasePrice: 3000 }, { productId: 'p_11', quantity: 6, unitPrice: 10000, purchasePrice: 5000 }, { productId: 'p_14', quantity: 8, unitPrice: 4500, purchasePrice: 2500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 126000, total: 186000, profit: 76000, createdAt: d(50), createdByUserId: 'u_cashier2' },
  { id: 's_11', type: 'RETAIL',    customerId: 'c_9',  items: [{ productId: 'p_11', quantity: 1, unitPrice: 12000, purchasePrice: 5000 }, { productId: 'p_14', quantity: 2, unitPrice: 5500, purchasePrice: 2500 }, { productId: 'p_15', quantity: 1, unitPrice: 3000, purchasePrice: 1200 }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 26000,  total: 26000,  profit: 14800, createdAt: d(47), createdByUserId: 'u_cashier' },
  { id: 's_12', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_3', quantity: 2, unitPrice: 15000, purchasePrice: 5000 }, { productId: 'p_5', quantity: 4, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_13', quantity: 4, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount: 64800,  total: 64800,  profit: 42800, createdAt: d(44), createdByUserId: 'u_cashier2' },
  { id: 's_13', type: 'RETAIL',    customerId: 'c_8',  items: [{ productId: 'p_1', quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_6', quantity: 1, unitPrice: 28000, purchasePrice: 12000 }], paymentMethod: 'CASH',          paidAmount: 63000,  total: 63000,  profit: 36000, createdAt: d(41), createdByUserId: 'u_cashier' },
  { id: 's_14', type: 'WHOLESALE', customerId: 'c_10', items: [{ productId: 'p_7', quantity: 5, unitPrice: 15000, purchasePrice: 8000 }, { productId: 'p_5', quantity: 8, unitPrice: 6500, purchasePrice: 3500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 127000, total: 127000, profit: 63000, createdAt: d(38), createdByUserId: 'u_cashier2' },
  // ── Mois -1 ──────────────────────────────────────────────────────────────────
  { id: 's_15', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_4', quantity: 1, unitPrice: 12000, purchasePrice: 4500 }, { productId: 'p_7', quantity: 2, unitPrice: 18000, purchasePrice: 8000 }, { productId: 'p_13', quantity: 1, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount: 48700,  total: 48700,  profit: 26700, createdAt: d(30), createdByUserId: 'u_cashier' },
  { id: 's_16', type: 'RETAIL',    customerId: 'c_6',  items: [{ productId: 'p_9', quantity: 2, unitPrice: 10000, purchasePrice: 4500 }, { productId: 'p_14', quantity: 1, unitPrice: 5500, purchasePrice: 2500 }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 25500,  total: 25500,  profit: 14000, createdAt: d(27), createdByUserId: 'u_cashier2' },
  { id: 's_17', type: 'WHOLESALE', customerId: 'c_7',  items: [{ productId: 'p_5', quantity: 12, unitPrice: 6500, purchasePrice: 3500 }, { productId: 'p_12', quantity: 15, unitPrice: 1200, purchasePrice: 500 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 96000,  total: 96000,  profit: 54000, createdAt: d(24), createdByUserId: 'u_cashier' },
  { id: 's_18', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_2', quantity: 1, unitPrice: 42000, purchasePrice: 18000 }, { productId: 'p_7', quantity: 1, unitPrice: 18000, purchasePrice: 8000 }, { productId: 'p_12', quantity: 1, unitPrice: 1500, purchasePrice: 500 }], paymentMethod: 'CASH',          paidAmount: 61500,  total: 61500,  profit: 35500, createdAt: d(22), createdByUserId: 'u_cashier2' },
  { id: 's_19', type: 'RETAIL',    customerId: 'c_3',  items: [{ productId: 'p_10', quantity: 4, unitPrice: 7000, purchasePrice: 3000 }, { productId: 'p_15', quantity: 2, unitPrice: 3000, purchasePrice: 1200 }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 34000,  total: 34000,  profit: 20400, createdAt: d(19), createdByUserId: 'u_cashier' },
  { id: 's_20', type: 'RETAIL',    customerId: 'c_5',  items: [{ productId: 'p_8', quantity: 1, unitPrice: 32000, purchasePrice: 14000 }, { productId: 'p_9', quantity: 1, unitPrice: 10000, purchasePrice: 4500 }], paymentMethod: 'CASH',          paidAmount: 42000,  total: 42000,  profit: 24000, createdAt: d(16), createdByUserId: 'u_cashier2' },
  // ── Semaine courante ──────────────────────────────────────────────────────────
  { id: 's_21', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_1', quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_13', quantity: 2, unitPrice: 700, purchasePrice: 200 }], paymentMethod: 'CASH',          paidAmount: 52400,  total: 52400,  profit: 29400, createdAt: d(5), createdByUserId: 'u_cashier' },
  { id: 's_22', type: 'WHOLESALE', customerId: 'c_4',  items: [{ productId: 'p_6', quantity: 3, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_7', quantity: 4, unitPrice: 15000, purchasePrice: 8000 }], paymentMethod: 'BANK_TRANSFER', paidAmount: 0,      total: 129000, profit: 61000, createdAt: d(4), createdByUserId: 'u_cashier2' },
  { id: 's_23', type: 'RETAIL',    customerId: 'c_9',  items: [{ productId: 'p_11', quantity: 2, unitPrice: 12000, purchasePrice: 5000 }, { productId: 'p_14', quantity: 1, unitPrice: 5500, purchasePrice: 2500 }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 29500,  total: 29500,  profit: 17500, createdAt: d(3), createdByUserId: 'u_cashier' },
  { id: 's_24', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_3', quantity: 1, unitPrice: 15000, purchasePrice: 5000 }, { productId: 'p_5', quantity: 2, unitPrice: 8000, purchasePrice: 3500 }, { productId: 'p_15', quantity: 2, unitPrice: 3000, purchasePrice: 1200 }], paymentMethod: 'CASH',          paidAmount: 37000,  total: 37000,  profit: 23600, createdAt: d(2), createdByUserId: 'u_cashier2' },
  { id: 's_25', type: 'RETAIL',    customerId: 'c_8',  items: [{ productId: 'p_10', quantity: 5, unitPrice: 7000, purchasePrice: 3000 }, { productId: 'p_12', quantity: 2, unitPrice: 1500, purchasePrice: 500 }], paymentMethod: 'CASH',          paidAmount: 38000,  total: 38000,  profit: 22000, createdAt: d(1), createdByUserId: 'u_cashier' },
  // ── Aujourd'hui ───────────────────────────────────────────────────────────────
  { id: 's_26', type: 'RETAIL',    customerId: 'c_5',  items: [{ productId: 'p_6',  quantity: 1, unitPrice: 28000, purchasePrice: 12000 }, { productId: 'p_7',  quantity: 2, unitPrice: 18000, purchasePrice: 8000  }, { productId: 'p_13', quantity: 1, unitPrice: 700,   purchasePrice: 200   }], paymentMethod: 'CASH',          paidAmount: 64700,  total: 64700,  profit: 36500, createdAt: today(9,  15), createdByUserId: 'u_cashier'  },
  { id: 's_27', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_5',  quantity: 2, unitPrice: 8000,  purchasePrice: 3500  }, { productId: 'p_33', quantity: 1, unitPrice: 2200,  purchasePrice: 800   }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 18200,  total: 18200,  profit: 10400, createdAt: today(11, 30), createdByUserId: 'u_cashier2' },
  { id: 's_28', type: 'WHOLESALE', customerId: 'c_7',  items: [{ productId: 'p_5',  quantity: 10, unitPrice: 6500,  purchasePrice: 3500  }, { productId: 'p_7',  quantity: 5,  unitPrice: 15000, purchasePrice: 8000  }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 140000, total: 140000, profit: 65000, createdAt: today(14, 45), createdByUserId: 'u_cashier'  },
  // ── Derniers 14 jours (1 vente/jour pour le graphique dashboard) ────────
  { id: 's_29', type: 'RETAIL',    customerId: 'c_3',  items: [{ productId: 'p_1',  quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_8',  quantity: 1, unitPrice: 32000, purchasePrice: 14000 }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 67000,  total: 67000,  profit: 38000, createdAt: d(6),      createdByUserId: 'u_cashier'  },
  { id: 's_30', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_3',  quantity: 1, unitPrice: 15000, purchasePrice: 5000  }, { productId: 'p_7',  quantity: 2, unitPrice: 18000, purchasePrice: 8000  }, { productId: 'p_12', quantity: 2, unitPrice: 1500,  purchasePrice: 500   }], paymentMethod: 'CASH',          paidAmount: 54000,  total: 54000,  profit: 32000, createdAt: d(7),      createdByUserId: 'u_cashier2' },
  { id: 's_31', type: 'RETAIL',    customerId: 'c_9',  items: [{ productId: 'p_22', quantity: 1, unitPrice: 42000, purchasePrice: 18000 }, { productId: 'p_9',  quantity: 1, unitPrice: 10000, purchasePrice: 4500  }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 52000,  total: 52000,  profit: 29500, createdAt: d(8),      createdByUserId: 'u_cashier'  },
  { id: 's_32', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_10', quantity: 3, unitPrice: 7000,  purchasePrice: 3000  }, { productId: 'p_15', quantity: 2, unitPrice: 3000,  purchasePrice: 1200  }, { productId: 'p_29', quantity: 1, unitPrice: 1000,  purchasePrice: 300   }], paymentMethod: 'CASH',          paidAmount: 28600,  total: 28600,  profit: 16300, createdAt: d(9),      createdByUserId: 'u_cashier2' },
  { id: 's_33', type: 'WHOLESALE', customerId: 'c_10', items: [{ productId: 'p_7',  quantity: 4, unitPrice: 15000, purchasePrice: 8000  }, { productId: 'p_5',  quantity: 8, unitPrice: 6500,  purchasePrice: 3500  }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 88000,  total: 88000,  profit: 52000, createdAt: d(10),     createdByUserId: 'u_cashier'  },
  { id: 's_34', type: 'RETAIL',    customerId: 'c_6',  items: [{ productId: 'p_26', quantity: 1, unitPrice: 12500, purchasePrice: 5500  }, { productId: 'p_14', quantity: 2, unitPrice: 5500,  purchasePrice: 2500  }, { productId: 'p_33', quantity: 1, unitPrice: 2200,  purchasePrice: 800   }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 25700,  total: 25700,  profit: 14400, createdAt: d(11),     createdByUserId: 'u_cashier2' },
  { id: 's_35', type: 'RETAIL',    customerId: 'c_8',  items: [{ productId: 'p_4',  quantity: 1, unitPrice: 12000, purchasePrice: 4500  }, { productId: 'p_5',  quantity: 2, unitPrice: 8000,  purchasePrice: 3500  }, { productId: 'p_13', quantity: 2, unitPrice: 700,   purchasePrice: 200   }], paymentMethod: 'CASH',          paidAmount: 29400,  total: 29400,  profit: 17500, createdAt: d(12),     createdByUserId: 'u_cashier'  },
  { id: 's_36', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_1',  quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_7',  quantity: 2, unitPrice: 18000, purchasePrice: 8000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 71000,  total: 71000,  profit: 40000, createdAt: d(13),     createdByUserId: 'u_cashier2' },
  { id: 's_37', type: 'WHOLESALE', customerId: 'c_2',  items: [{ productId: 'p_10', quantity: 6, unitPrice: 6000,  purchasePrice: 3000  }, { productId: 'p_9',  quantity: 3, unitPrice: 8500,  purchasePrice: 4500  }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 61500,  total: 61500,  profit: 30000, createdAt: d(14),     createdByUserId: 'u_cashier'  },
  // ── Mois courant (jours 15–36) ────────────────────────────────────
  { id: 's_38', type: 'WHOLESALE', customerId: 'c_11', items: [{ productId: 'p_23', quantity: 2, unitPrice: 36000, purchasePrice: 15000 }, { productId: 'p_21', quantity: 2, unitPrice: 14000, purchasePrice: 6000  }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 100000, total: 100000, profit: 58000, createdAt: d(15),     createdByUserId: 'u_cashier2' },
  { id: 's_39', type: 'RETAIL',    customerId: 'c_12', items: [{ productId: 'p_16', quantity: 1, unitPrice: 55000, purchasePrice: 22000 }, { productId: 'p_23', quantity: 1, unitPrice: 36000, purchasePrice: 15000 }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 91000,  total: 91000,  profit: 54000, createdAt: d(17),     createdByUserId: 'u_cashier'  },
  { id: 's_40', type: 'WHOLESALE', customerId: 'c_13', items: [{ productId: 'p_5',  quantity: 20, unitPrice: 6500,  purchasePrice: 3500  }, { productId: 'p_6',  quantity: 5, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_9',  quantity: 10, unitPrice: 8500,  purchasePrice: 4500  }], paymentMethod: 'BANK_TRANSFER', paidAmount: 0,      total: 330000, profit: 155000, createdAt: d(18),     createdByUserId: 'u_cashier2' },
  { id: 's_41', type: 'RETAIL',    customerId: 'c_14', items: [{ productId: 'p_19', quantity: 1, unitPrice: 10000, purchasePrice: 4000  }, { productId: 'p_5',  quantity: 2, unitPrice: 8000,  purchasePrice: 3500  }, { productId: 'p_33', quantity: 1, unitPrice: 2200,  purchasePrice: 800   }], paymentMethod: 'MOBILE_MONEY',  paidAmount: 28200,  total: 28200,  profit: 16400, createdAt: d(20),     createdByUserId: 'u_cashier'  },
  { id: 's_42', type: 'RETAIL',    customerId: 'c_3',  items: [{ productId: 'p_28', quantity: 1, unitPrice: 16000, purchasePrice: 7000  }, { productId: 'p_31', quantity: 1, unitPrice: 4500,  purchasePrice: 2000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 20500,  total: 20500,  profit: 11500, createdAt: d(21),     createdByUserId: 'u_cashier2' },
  { id: 's_43', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_17', quantity: 1, unitPrice: 45000, purchasePrice: 18000 }, { productId: 'p_7',  quantity: 2, unitPrice: 18000, purchasePrice: 8000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 81000,  total: 81000,  profit: 47000, createdAt: d(23),     createdByUserId: 'u_cashier'  },
  { id: 's_44', type: 'WHOLESALE', customerId: 'c_4',  items: [{ productId: 'p_6',  quantity: 4, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_8',  quantity: 2, unitPrice: 26000, purchasePrice: 14000 }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 0,      total: 144000, profit: 68000, createdAt: d(25),     createdByUserId: 'u_cashier2' },
  { id: 's_45', type: 'RETAIL',    customerId: 'c_8',  items: [{ productId: 'p_18', quantity: 1, unitPrice: 85000, purchasePrice: 35000 }, { productId: 'p_25', quantity: 2, unitPrice: 48000, purchasePrice: 20000 }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 181000, total: 181000, profit: 106000, createdAt: d(26),     createdByUserId: 'u_cashier'  },
  { id: 's_46', type: 'RETAIL',    customerId: 'c_5',  items: [{ productId: 'p_27', quantity: 1, unitPrice: 15000, purchasePrice: 6500  }, { productId: 'p_32', quantity: 1, unitPrice: 8000,  purchasePrice: 3500  }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 23000,  total: 23000,  profit: 13000, createdAt: d(28),     createdByUserId: 'u_cashier2' },
  { id: 's_47', type: 'RETAIL',    customerId: 'c_6',  items: [{ productId: 'p_11', quantity: 1, unitPrice: 12000, purchasePrice: 5000  }, { productId: 'p_14', quantity: 1, unitPrice: 5500,  purchasePrice: 2500  }, { productId: 'p_15', quantity: 2, unitPrice: 3000,  purchasePrice: 1200  }], paymentMethod: 'CASH',          paidAmount: 23500,  total: 23500,  profit: 13600, createdAt: d(29),     createdByUserId: 'u_cashier'  },
  { id: 's_48', type: 'WHOLESALE', customerId: 'c_15', items: [{ productId: 'p_5',  quantity: 15, unitPrice: 6500,  purchasePrice: 3500  }, { productId: 'p_6',  quantity: 8, unitPrice: 23000, purchasePrice: 12000 }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 281500, total: 281500, profit: 133000, createdAt: d(32),     createdByUserId: 'u_cashier2' },
  { id: 's_49', type: 'RETAIL',    customerId: 'c_12', items: [{ productId: 'p_24', quantity: 2, unitPrice: 24000, purchasePrice: 10000 }, { productId: 'p_13', quantity: 2, unitPrice: 700,   purchasePrice: 200   }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 49400,  total: 49400,  profit: 29000, createdAt: d(34),     createdByUserId: 'u_cashier'  },
  { id: 's_50', type: 'RETAIL',    customerId: 'c_9',  items: [{ productId: 'p_20', quantity: 1, unitPrice: 22000, purchasePrice: 8000  }, { productId: 'p_21', quantity: 2, unitPrice: 14000, purchasePrice: 6000  }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 50000,  total: 50000,  profit: 30000, createdAt: d(36),     createdByUserId: 'u_cashier2' },
  // ── Mois -1 (jours 37–60, complément) ─────────────────────────────
  { id: 's_51', type: 'RETAIL',    customerId: 'c_3',  items: [{ productId: 'p_26', quantity: 2, unitPrice: 12500, purchasePrice: 5500  }, { productId: 'p_31', quantity: 2, unitPrice: 4500,  purchasePrice: 2000  }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 34000,  total: 34000,  profit: 19000, createdAt: d(37),     createdByUserId: 'u_cashier'  },
  { id: 's_52', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_2',  quantity: 1, unitPrice: 42000, purchasePrice: 18000 }, { productId: 'p_23', quantity: 2, unitPrice: 36000, purchasePrice: 15000 }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 114000, total: 114000, profit: 66000, createdAt: d(40),     createdByUserId: 'u_cashier2' },
  { id: 's_53', type: 'WHOLESALE', customerId: 'c_7',  items: [{ productId: 'p_5',  quantity: 12, unitPrice: 6500,  purchasePrice: 3500  }, { productId: 'p_12', quantity: 20, unitPrice: 1200,  purchasePrice: 500   }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 102000, total: 102000, profit: 50000, createdAt: d(42),     createdByUserId: 'u_cashier'  },
  { id: 's_54', type: 'RETAIL',    customerId: 'c_1',  items: [{ productId: 'p_27', quantity: 1, unitPrice: 15000, purchasePrice: 6500  }, { productId: 'p_28', quantity: 1, unitPrice: 16000, purchasePrice: 7000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 31000,  total: 31000,  profit: 17500, createdAt: d(45),     createdByUserId: 'u_cashier2' },
  { id: 's_55', type: 'RETAIL',    customerId: 'c_14', items: [{ productId: 'p_4',  quantity: 1, unitPrice: 12000, purchasePrice: 4500  }, { productId: 'p_33', quantity: 2, unitPrice: 2200,  purchasePrice: 800   }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 16400,  total: 16400,  profit: 9700,  createdAt: d(48),     createdByUserId: 'u_cashier'  },
  { id: 's_56', type: 'WHOLESALE', customerId: 'c_4',  items: [{ productId: 'p_9',  quantity: 6, unitPrice: 8500,  purchasePrice: 4500  }, { productId: 'p_10', quantity: 12, unitPrice: 6000,  purchasePrice: 3000  }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 123000, total: 123000, profit: 60000, createdAt: d(50),     createdByUserId: 'u_cashier2' },
  { id: 's_57', type: 'RETAIL',    customerId: 'c_9',  items: [{ productId: 'p_22', quantity: 2, unitPrice: 42000, purchasePrice: 18000 }, { productId: 'p_7',  quantity: 1, unitPrice: 18000, purchasePrice: 8000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 102000, total: 102000, profit: 58000, createdAt: d(53),     createdByUserId: 'u_cashier'  },
  { id: 's_58', type: 'RETAIL',    customerId: 'c_12', items: [{ productId: 'p_3',  quantity: 2, unitPrice: 15000, purchasePrice: 5000  }, { productId: 'p_5',  quantity: 4, unitPrice: 8000,  purchasePrice: 3500  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 62000,  total: 62000,  profit: 38000, createdAt: d(56),     createdByUserId: 'u_cashier2' },
  { id: 's_59', type: 'RETAIL',    customerId: 'c_6',  items: [{ productId: 'p_11', quantity: 2, unitPrice: 12000, purchasePrice: 5000  }, { productId: 'p_14', quantity: 2, unitPrice: 5500,  purchasePrice: 2500  }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 35000,  total: 35000,  profit: 20000, createdAt: d(58),     createdByUserId: 'u_cashier'  },
  // ── Mois -2 (jours 61–90, complément) ─────────────────────────────
  { id: 's_60', type: 'WHOLESALE', customerId: 'c_11', items: [{ productId: 'p_6',  quantity: 3, unitPrice: 23000, purchasePrice: 12000 }, { productId: 'p_8',  quantity: 3, unitPrice: 26000, purchasePrice: 14000 }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 147000, total: 147000, profit: 69000, createdAt: d(62),     createdByUserId: 'u_cashier2' },
  { id: 's_61', type: 'RETAIL',    customerId: 'c_3',  items: [{ productId: 'p_17', quantity: 1, unitPrice: 45000, purchasePrice: 18000 }, { productId: 'p_7',  quantity: 1, unitPrice: 18000, purchasePrice: 8000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 63000,  total: 63000,  profit: 37000, createdAt: d(65),     createdByUserId: 'u_cashier'  },
  { id: 's_62', type: 'RETAIL',    customerId: undefined, items: [{ productId: 'p_10', quantity: 4, unitPrice: 7000,  purchasePrice: 3000  }, { productId: 'p_15', quantity: 3, unitPrice: 3000,  purchasePrice: 1200  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 37000,  total: 37000,  profit: 22400, createdAt: d(68),     createdByUserId: 'u_cashier2' },
  { id: 's_63', type: 'WHOLESALE', customerId: 'c_2',  items: [{ productId: 'p_9',  quantity: 8, unitPrice: 8500,  purchasePrice: 4500  }, { productId: 'p_10', quantity: 10, unitPrice: 6000,  purchasePrice: 3000  }],                                                                                                            paymentMethod: 'BANK_TRANSFER', paidAmount: 128000, total: 128000, profit: 62000, createdAt: d(71),     createdByUserId: 'u_cashier'  },
  { id: 's_64', type: 'RETAIL',    customerId: 'c_5',  items: [{ productId: 'p_1',  quantity: 1, unitPrice: 35000, purchasePrice: 15000 }, { productId: 'p_6',  quantity: 1, unitPrice: 28000, purchasePrice: 12000 }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 63000,  total: 63000,  profit: 36000, createdAt: d(74),     createdByUserId: 'u_cashier2' },
  { id: 's_65', type: 'RETAIL',    customerId: 'c_6',  items: [{ productId: 'p_26', quantity: 1, unitPrice: 12500, purchasePrice: 5500  }, { productId: 'p_32', quantity: 1, unitPrice: 8000,  purchasePrice: 3500  }],                                                                                                            paymentMethod: 'MOBILE_MONEY',  paidAmount: 20500,  total: 20500,  profit: 11500, createdAt: d(77),     createdByUserId: 'u_cashier'  },
  { id: 's_66', type: 'RETAIL',    customerId: 'c_8',  items: [{ productId: 'p_4',  quantity: 2, unitPrice: 12000, purchasePrice: 4500  }, { productId: 'p_19', quantity: 2, unitPrice: 10000, purchasePrice: 4000  }],                                                                                                            paymentMethod: 'CASH',          paidAmount: 44000,  total: 44000,  profit: 27000, createdAt: d(80),     createdByUserId: 'u_cashier2' }
];

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po_1', supplierId: 'sup_1', supplierName: 'Essilor Distribution CI',
    status: 'DELIVERED',
    createdAt: d(88), deliveredAt: d(82),
    lines: [
      { productId: 'p_5', productSku: 'VER-UNI-SP', productName: 'Verre Unifocal Sphérique',   quantity: 50, unitPurchasePrice: 3500, lineTotal: 175_000 },
      { productId: 'p_6', productSku: 'VER-PRO-PM', productName: 'Verre Progressif Premium',    quantity: 20, unitPurchasePrice: 12000, lineTotal: 240_000 },
      { productId: 'p_7', productSku: 'VER-AR-BC',  productName: 'Verre Antireflet Bluecut',    quantity: 25, unitPurchasePrice: 8000, lineTotal: 200_000 },
      { productId: 'p_13', productSku: 'ACC-MCF-X', productName: 'Chiffon microfibre',           quantity: 80, unitPurchasePrice: 200, lineTotal: 16_000 }
    ],
    totalAmount: 631_000, paidAmount: 631_000,
    invoice: { invoiceNumber: 'ESS-2026-001', invoiceDateIso: d(84), totalAmount: 631_000 }
  },
  {
    id: 'po_2', supplierId: 'sup_2', supplierName: 'Luxottica Afrique de l\'Ouest',
    status: 'DELIVERED',
    createdAt: d(85), deliveredAt: d(78),
    lines: [
      { productId: 'p_1', productSku: 'MON-RB3025', productName: 'Monture Ray-Ban RB3025',  quantity: 20, unitPurchasePrice: 15000, lineTotal: 300_000 },
      { productId: 'p_2', productSku: 'MON-OX8046', productName: 'Monture Oakley OX8046',   quantity: 15, unitPurchasePrice: 18000, lineTotal: 270_000 },
      { productId: 'p_3', productSku: 'MON-GEN-F',  productName: 'Monture Générique Femme', quantity: 25, unitPurchasePrice: 5000, lineTotal: 125_000 },
      { productId: 'p_12', productSku: 'ACC-ETU-RIG', productName: 'Étui lunettes rigide',  quantity: 50, unitPurchasePrice: 500, lineTotal: 25_000 }
    ],
    totalAmount: 720_000, paidAmount: 720_000,
    invoice: { invoiceNumber: 'LUX-2026-010', invoiceDateIso: d(80), totalAmount: 720_000 }
  },
  {
    id: 'po_3', supplierId: 'sup_3', supplierName: 'CooperVision Afrique',
    status: 'DELIVERED',
    createdAt: d(80), deliveredAt: d(72),
    lines: [
      { productId: 'p_9',  productSku: 'LEN-MEN-CV', productName: 'Lentilles Mensuelles CooperVision', quantity: 40, unitPurchasePrice: 4500, lineTotal: 180_000 },
      { productId: 'p_10', productSku: 'LEN-JOU-CV', productName: 'Lentilles Journalières (boîte 30)', quantity: 80, unitPurchasePrice: 3000, lineTotal: 240_000 }
    ],
    totalAmount: 420_000, paidAmount: 420_000,
    invoice: { invoiceNumber: 'CV-2026-003', invoiceDateIso: d(74), totalAmount: 420_000 }
  },
  {
    id: 'po_4', supplierId: 'sup_5', supplierName: 'Alcon Laboratoires CI',
    status: 'DELIVERED',
    createdAt: d(58), deliveredAt: d(52),
    lines: [
      { productId: 'p_11', productSku: 'LEN-COL-AL',  productName: 'Lentilles Colorées Alcon',       quantity: 30, unitPurchasePrice: 5000, lineTotal: 150_000 },
      { productId: 'p_14', productSku: 'SOL-MUL-360', productName: 'Solution multifonction 360ml', quantity: 40, unitPurchasePrice: 2500, lineTotal: 100_000 },
      { productId: 'p_15', productSku: 'SOL-SAL-250', productName: 'Solution saline 250ml',         quantity: 50, unitPurchasePrice: 1200, lineTotal: 60_000 }
    ],
    totalAmount: 310_000, paidAmount: 310_000,
    invoice: { invoiceNumber: 'ALC-2026-007', invoiceDateIso: d(54), totalAmount: 310_000 }
  },
  {
    id: 'po_5', supplierId: 'sup_1', supplierName: 'Essilor Distribution CI',
    status: 'DELIVERED',
    createdAt: d(48), deliveredAt: d(42),
    lines: [
      { productId: 'p_5', productSku: 'VER-UNI-SP', productName: 'Verre Unifocal Sphérique', quantity: 30, unitPurchasePrice: 3500, lineTotal: 105_000 },
      { productId: 'p_6', productSku: 'VER-PRO-PM', productName: 'Verre Progressif Premium', quantity: 15, unitPurchasePrice: 12000, lineTotal: 180_000 },
      { productId: 'p_7', productSku: 'VER-AR-BC',  productName: 'Verre Antireflet Bluecut', quantity: 20, unitPurchasePrice: 8000, lineTotal: 160_000 }
    ],
    totalAmount: 445_000, paidAmount: 445_000,
    invoice: { invoiceNumber: 'ESS-2026-009', invoiceDateIso: d(44), totalAmount: 445_000 }
  },
  {
    id: 'po_6', supplierId: 'sup_4', supplierName: 'Transitions Optical',
    status: 'DELIVERED',
    createdAt: d(40), deliveredAt: d(34),
    lines: [
      { productId: 'p_8', productSku: 'VER-PHC-TR', productName: 'Verre Photochromique Transitions', quantity: 20, unitPurchasePrice: 14000, lineTotal: 280_000 }
    ],
    totalAmount: 280_000, paidAmount: 280_000,
    invoice: { invoiceNumber: 'TRN-2026-004', invoiceDateIso: d(36), totalAmount: 280_000 }
  },
  {
    id: 'po_7', supplierId: 'sup_3', supplierName: 'CooperVision Afrique',
    status: 'DELIVERED',
    createdAt: d(28), deliveredAt: d(22),
    lines: [
      { productId: 'p_9',  productSku: 'LEN-MEN-CV', productName: 'Lentilles Mensuelles', quantity: 40, unitPurchasePrice: 4500, lineTotal: 180_000 },
      { productId: 'p_10', productSku: 'LEN-JOU-CV', productName: 'Lentilles Journalières', quantity: 80, unitPurchasePrice: 3000, lineTotal: 240_000 }
    ],
    totalAmount: 420_000, paidAmount: 210_000,
    invoice: { invoiceNumber: 'CV-2026-011', invoiceDateIso: d(24), totalAmount: 420_000 }
  },
  {
    id: 'po_8', supplierId: 'sup_2', supplierName: 'Luxottica Afrique de l\'Ouest',
    status: 'PENDING',
    createdAt: d(5),
    lines: [
      { productId: 'p_1', productSku: 'MON-RB3025', productName: 'Monture Ray-Ban RB3025',   quantity: 15, unitPurchasePrice: 15000, lineTotal: 225_000 },
      { productId: 'p_4', productSku: 'MON-ENF-S',  productName: 'Monture Enfant Sport',     quantity: 20, unitPurchasePrice: 4500,  lineTotal: 90_000 },
      { productId: 'p_12', productSku: 'ACC-ETU-RIG', productName: 'Étui lunettes rigide',   quantity: 50, unitPurchasePrice: 500,   lineTotal: 25_000 }
    ],
    totalAmount: 340_000, paidAmount: 0
  },
  {
    id: 'po_9', supplierId: 'sup_1', supplierName: 'Essilor Distribution CI',
    status: 'DELIVERED',
    createdAt: d(20), deliveredAt: d(14),
    lines: [
      { productId: 'p_21', productSku: 'VER-BIF-STD',  productName: 'Verre Bifocal Standard',          quantity: 40, unitPurchasePrice: 6000,  lineTotal: 240_000 },
      { productId: 'p_22', productSku: 'VER-174-ULT',  productName: 'Verre Ultra-Mince 1.74',          quantity: 20, unitPurchasePrice: 18000, lineTotal: 360_000 },
      { productId: 'p_23', productSku: 'VER-AR-CRIZ', productName: 'Verre AR Crizal Essilor',         quantity: 25, unitPurchasePrice: 15000, lineTotal: 375_000 },
      { productId: 'p_33', productSku: 'ACC-SPR-100',  productName: 'Spray nettoyant lunettes 100ml', quantity: 50, unitPurchasePrice: 800,   lineTotal: 40_000  }
    ],
    totalAmount: 1_015_000, paidAmount: 1_015_000,
    invoice: { invoiceNumber: 'ESS-2026-014', invoiceDateIso: d(16), totalAmount: 1_015_000 }
  },
  {
    id: 'po_10', supplierId: 'sup_2', supplierName: "Luxottica Afrique de l'Ouest",
    status: 'DELIVERED',
    createdAt: d(32), deliveredAt: d(26),
    lines: [
      { productId: 'p_16', productSku: 'MON-TF5823',  productName: 'Monture Tom Ford TF5823',          quantity: 10, unitPurchasePrice: 22000, lineTotal: 220_000 },
      { productId: 'p_17', productSku: 'MON-RAB-AV',  productName: 'Monture Ray-Ban Aviator Classic', quantity: 10, unitPurchasePrice: 18000, lineTotal: 180_000 },
      { productId: 'p_18', productSku: 'MON-SIL-TI',  productName: 'Monture Silhouette Titan',        quantity: 5,  unitPurchasePrice: 35000, lineTotal: 175_000 },
      { productId: 'p_29', productSku: 'ACC-COR-SIL', productName: 'Cordon anti-perte Silicone',      quantity: 80, unitPurchasePrice: 300,   lineTotal: 24_000  },
      { productId: 'p_35', productSku: 'ACC-VIS-COR', productName: 'Visserie remplacement monture',   quantity: 50, unitPurchasePrice: 200,   lineTotal: 10_000  }
    ],
    totalAmount: 609_000, paidAmount: 609_000,
    invoice: { invoiceNumber: 'LUX-2026-021', invoiceDateIso: d(28), totalAmount: 609_000 }
  },
  {
    id: 'po_11', supplierId: 'sup_5', supplierName: 'Alcon Laboratoires CI',
    status: 'PENDING',
    createdAt: d(3),
    lines: [
      { productId: 'p_28', productSku: 'LEN-SP-ACU',  productName: 'Lentilles Sport Acuvue Oasys',   quantity: 30, unitPurchasePrice: 7000,  lineTotal: 210_000 },
      { productId: 'p_31', productSku: 'SOL-SAL-500', productName: 'Solution saline stérile 500ml',  quantity: 40, unitPurchasePrice: 2000,  lineTotal: 80_000  },
      { productId: 'p_32', productSku: 'SOL-PERO-CC', productName: 'Clear Care solution peroxyde',    quantity: 20, unitPurchasePrice: 3500,  lineTotal: 70_000  }
    ],
    totalAmount: 360_000, paidAmount: 0
  }
];

// ─── Supplier Payments ────────────────────────────────────────────────────────
export const MOCK_SUPPLIER_PAYMENTS: SupplierPayment[] = [
  { id: 'spay_1', supplierId: 'sup_1', orderId: 'po_1', paymentDateIso: d(84), amount: 631_000, note: 'Règlement total commande PO-001' },
  { id: 'spay_2', supplierId: 'sup_2', orderId: 'po_2', paymentDateIso: d(80), amount: 720_000, note: 'Règlement total commande PO-002' },
  { id: 'spay_3', supplierId: 'sup_3', orderId: 'po_3', paymentDateIso: d(73), amount: 420_000, note: 'Règlement total commande PO-003' },
  { id: 'spay_4', supplierId: 'sup_5', orderId: 'po_4', paymentDateIso: d(53), amount: 310_000, note: 'Virement bancaire' },
  { id: 'spay_5', supplierId: 'sup_1', orderId: 'po_5', paymentDateIso: d(43), amount: 445_000, note: 'Règlement total commande PO-005' },
  { id: 'spay_6', supplierId: 'sup_4', orderId: 'po_6', paymentDateIso: d(35), amount: 280_000, note: 'Règlement total commande PO-006' },
  { id: 'spay_7', supplierId: 'sup_3', orderId: 'po_7',  paymentDateIso: d(23), amount: 210_000,   note: 'Acompte 50% commande PO-007' },
  { id: 'spay_8', supplierId: 'sup_1', orderId: 'po_9',  paymentDateIso: d(15), amount: 1_015_000, note: 'Règlement total commande PO-009' },
  { id: 'spay_9', supplierId: 'sup_2', orderId: 'po_10', paymentDateIso: d(27), amount: 609_000,   note: 'Règlement total commande PO-010' }
];

// ─── Supplier Purchase History ────────────────────────────────────────────────
export const MOCK_SUPPLIER_PURCHASES: SupplierPurchaseHistory[] = [
  { id: 'sph_1', supplierId: 'sup_1', purchaseDateIso: d(88), reference: 'PO-001', itemsCount: 175, totalAmount: 631_000 },
  { id: 'sph_2', supplierId: 'sup_2', purchaseDateIso: d(85), reference: 'PO-002', itemsCount: 110, totalAmount: 720_000 },
  { id: 'sph_3', supplierId: 'sup_3', purchaseDateIso: d(80), reference: 'PO-003', itemsCount: 120, totalAmount: 420_000 },
  { id: 'sph_4', supplierId: 'sup_5', purchaseDateIso: d(58), reference: 'PO-004', itemsCount: 120, totalAmount: 310_000 },
  { id: 'sph_5', supplierId: 'sup_1', purchaseDateIso: d(48), reference: 'PO-005', itemsCount: 65,  totalAmount: 445_000 },
  { id: 'sph_6', supplierId: 'sup_4', purchaseDateIso: d(40), reference: 'PO-006', itemsCount: 20,  totalAmount: 280_000 },
  { id: 'sph_7', supplierId: 'sup_3', purchaseDateIso: d(28), reference: 'PO-007', itemsCount: 120, totalAmount: 420_000 },
  { id: 'sph_8',  supplierId: 'sup_2', purchaseDateIso: d(5),  reference: 'PO-008', itemsCount: 85,  totalAmount: 340_000 },
  { id: 'sph_9',  supplierId: 'sup_1', purchaseDateIso: d(20), reference: 'PO-009', itemsCount: 135, totalAmount: 1_015_000 },
  { id: 'sph_10', supplierId: 'sup_2', purchaseDateIso: d(32), reference: 'PO-010', itemsCount: 155, totalAmount: 609_000 }
];

// ─── Stock Movements ──────────────────────────────────────────────────────────
export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  // Réceptions (SUPPLY)
  { id: 'sm_01', productId: 'p_5',  quantity:  50, reason: 'SUPPLY',     note: 'Réception PO-001 (wh_1)',         createdAt: d(82), createdByUserId: 'u_mgr' },
  { id: 'sm_02', productId: 'p_6',  quantity:  20, reason: 'SUPPLY',     note: 'Réception PO-001 (wh_1)',         createdAt: d(82), createdByUserId: 'u_mgr' },
  { id: 'sm_03', productId: 'p_7',  quantity:  25, reason: 'SUPPLY',     note: 'Réception PO-001 (wh_1)',         createdAt: d(82), createdByUserId: 'u_mgr' },
  { id: 'sm_04', productId: 'p_13', quantity:  80, reason: 'SUPPLY',     note: 'Réception PO-001 (wh_1)',         createdAt: d(82), createdByUserId: 'u_mgr' },
  { id: 'sm_05', productId: 'p_1',  quantity:  20, reason: 'SUPPLY',     note: 'Réception PO-002 (wh_1)',         createdAt: d(78), createdByUserId: 'u_mgr' },
  { id: 'sm_06', productId: 'p_2',  quantity:  15, reason: 'SUPPLY',     note: 'Réception PO-002 (wh_1)',         createdAt: d(78), createdByUserId: 'u_mgr' },
  { id: 'sm_07', productId: 'p_3',  quantity:  25, reason: 'SUPPLY',     note: 'Réception PO-002 (wh_1)',         createdAt: d(78), createdByUserId: 'u_mgr' },
  { id: 'sm_08', productId: 'p_12', quantity:  50, reason: 'SUPPLY',     note: 'Réception PO-002 (wh_1)',         createdAt: d(78), createdByUserId: 'u_mgr' },
  { id: 'sm_09', productId: 'p_9',  quantity:  40, reason: 'SUPPLY',     note: 'Réception PO-003 (wh_1)',         createdAt: d(72), createdByUserId: 'u_mgr' },
  { id: 'sm_10', productId: 'p_10', quantity:  80, reason: 'SUPPLY',     note: 'Réception PO-003 (wh_1)',         createdAt: d(72), createdByUserId: 'u_mgr' },
  // Ventes (SALE - quelques mouvements représentatifs)
  { id: 'sm_11', productId: 'p_5',  quantity:  -2, reason: 'SALE',       note: 'Vente s_01 (wh_1)',               createdAt: d(85), createdByUserId: 'u_cashier' },
  { id: 'sm_12', productId: 'p_5',  quantity: -10, reason: 'SALE',       note: 'Vente s_02 (wh_1)',               createdAt: d(82), createdByUserId: 'u_cashier' },
  { id: 'sm_13', productId: 'p_7',  quantity:  -6, reason: 'SALE',       note: 'Vente s_02 (wh_1)',               createdAt: d(82), createdByUserId: 'u_cashier' },
  { id: 'sm_14', productId: 'p_1',  quantity:  -1, reason: 'SALE',       note: 'Vente s_03 (wh_1)',               createdAt: d(79), createdByUserId: 'u_cashier2' },
  { id: 'sm_15', productId: 'p_10', quantity: -15, reason: 'SALE',       note: 'Vente s_10 (wh_1)',               createdAt: d(50), createdByUserId: 'u_cashier2' },
  // Pertes
  { id: 'sm_16', productId: 'p_13', quantity:  -4, reason: 'LOSS',       note: 'Chiffons abîmés au transport',    createdAt: d(63), createdByUserId: 'u_mgr' },
  { id: 'sm_17', productId: 'p_15', quantity:  -2, reason: 'LOSS',       note: 'Flacon cassé en rayon',           createdAt: d(45), createdByUserId: 'u_cashier' },
  // Ajustements (inventaire/transfert)
  { id: 'sm_18', productId: 'p_13', quantity:  -2, reason: 'ADJUSTMENT', note: 'Inventaire Inv-001 (wh_1)',       createdAt: d(20), createdByUserId: 'u_mgr' },
  { id: 'sm_19', productId: 'p_10', quantity: -10, reason: 'ADJUSTMENT', note: 'Transfert wh_1 → wh_2',           createdAt: d(15), createdByUserId: 'u_mgr' },
  { id: 'sm_20', productId: 'p_10', quantity:  10, reason: 'ADJUSTMENT', note: 'Transfert wh_1 → wh_2',                  createdAt: d(15), createdByUserId: 'u_mgr'      },
  // Réceptions PO-009
  { id: 'sm_21', productId: 'p_21', quantity:  40, reason: 'SUPPLY',     note: 'Réception PO-009 (wh_1)',                   createdAt: d(14), createdByUserId: 'u_mgr'      },
  { id: 'sm_22', productId: 'p_22', quantity:  20, reason: 'SUPPLY',     note: 'Réception PO-009 (wh_1)',                   createdAt: d(14), createdByUserId: 'u_mgr'      },
  { id: 'sm_23', productId: 'p_23', quantity:  25, reason: 'SUPPLY',     note: 'Réception PO-009 (wh_1)',                   createdAt: d(14), createdByUserId: 'u_mgr'      },
  { id: 'sm_24', productId: 'p_33', quantity:  50, reason: 'SUPPLY',     note: 'Réception PO-009 (wh_1)',                   createdAt: d(14), createdByUserId: 'u_mgr'      },
  // Réceptions PO-010
  { id: 'sm_25', productId: 'p_16', quantity:  10, reason: 'SUPPLY',     note: 'Réception PO-010 (wh_1)',                   createdAt: d(26), createdByUserId: 'u_mgr'      },
  { id: 'sm_26', productId: 'p_17', quantity:  10, reason: 'SUPPLY',     note: 'Réception PO-010 (wh_1)',                   createdAt: d(26), createdByUserId: 'u_mgr'      },
  { id: 'sm_27', productId: 'p_18', quantity:   5, reason: 'SUPPLY',     note: 'Réception PO-010 (wh_1)',                   createdAt: d(26), createdByUserId: 'u_mgr'      },
  { id: 'sm_28', productId: 'p_29', quantity:  80, reason: 'SUPPLY',     note: 'Réception PO-010 (wh_1)',                   createdAt: d(26), createdByUserId: 'u_mgr'      },
  // Ventes récentes – mouvements associés
  { id: 'sm_29', productId: 'p_5',  quantity: -10, reason: 'SALE',       note: 'Vente s_28 (wh_1)',                      createdAt: today(14, 45), createdByUserId: 'u_cashier' },
  { id: 'sm_30', productId: 'p_7',  quantity:  -5, reason: 'SALE',       note: 'Vente s_28 (wh_1)',                      createdAt: today(14, 45), createdByUserId: 'u_cashier' },
  { id: 'sm_31', productId: 'p_6',  quantity:  -1, reason: 'SALE',       note: 'Vente s_26 (wh_1)',                      createdAt: today(9,  15), createdByUserId: 'u_cashier' },
  { id: 'sm_32', productId: 'p_22', quantity:  -1, reason: 'SALE',       note: 'Vente s_31 (wh_1)',                      createdAt: d(8),          createdByUserId: 'u_cashier' },
  { id: 'sm_33', productId: 'p_16', quantity:  -1, reason: 'SALE',       note: 'Vente s_39 (wh_1)',                      createdAt: d(17),         createdByUserId: 'u_cashier' },
  { id: 'sm_34', productId: 'p_17', quantity:  -1, reason: 'SALE',       note: 'Vente s_43 (wh_1)',                      createdAt: d(23),         createdByUserId: 'u_cashier' },
  { id: 'sm_35', productId: 'p_18', quantity:  -1, reason: 'SALE',       note: 'Vente s_45 (wh_1)',                      createdAt: d(26),         createdByUserId: 'u_cashier' },
  { id: 'sm_36', productId: 'p_5',  quantity: -20, reason: 'SALE',       note: 'Vente s_40 (wh_1)',                      createdAt: d(18),         createdByUserId: 'u_cashier2' },
  { id: 'sm_37', productId: 'p_6',  quantity:  -5, reason: 'SALE',       note: 'Vente s_40 (wh_1)',                      createdAt: d(18),         createdByUserId: 'u_cashier2' },
  { id: 'sm_38', productId: 'p_6',  quantity:  -8, reason: 'SALE',       note: 'Vente s_48 (wh_1)',                      createdAt: d(32),         createdByUserId: 'u_cashier2' },
  { id: 'sm_39', productId: 'p_5',  quantity: -12, reason: 'SALE',       note: 'Vente s_53 (wh_1)',                      createdAt: d(42),         createdByUserId: 'u_cashier' },
  // Pertes supplémentaires
  { id: 'sm_40', productId: 'p_8',  quantity:  -1, reason: 'LOSS',       note: 'Verre brisé en rayon',                    createdAt: d(35),         createdByUserId: 'u_mgr'     },
  { id: 'sm_41', productId: 'p_12', quantity:  -2, reason: 'LOSS',       note: 'Étuis endommagés transport',               createdAt: d(22),         createdByUserId: 'u_cashier' },
  { id: 'sm_42', productId: 'p_31', quantity:  -1, reason: 'LOSS',       note: 'Flacon percé en stockage',                 createdAt: d(10),         createdByUserId: 'u_cashier2' },
  // Ajustements / transferts
  { id: 'sm_43', productId: 'p_5',  quantity:  -5, reason: 'ADJUSTMENT', note: 'Transfert wh_1 → wh_2 (appoint.)',        createdAt: d(40),         createdByUserId: 'u_mgr'     },
  { id: 'sm_44', productId: 'p_5',  quantity:   5, reason: 'ADJUSTMENT', note: 'Transfert wh_1 → wh_2 (appoint.)',        createdAt: d(40),         createdByUserId: 'u_mgr'     },
  { id: 'sm_45', productId: 'p_7',  quantity: -10, reason: 'ADJUSTMENT', note: 'Inventaire Inv-002 (écart)',                createdAt: d(30),         createdByUserId: 'u_mgr'     },
  { id: 'sm_46', productId: 'p_9',  quantity:  -3, reason: 'ADJUSTMENT', note: 'Inventaire Inv-002 (écart)',                createdAt: d(30),         createdByUserId: 'u_mgr'     },
  { id: 'sm_47', productId: 'p_21', quantity: -10, reason: 'ADJUSTMENT', note: 'Transfert wh_1 → wh_2 (stock équilibrage)',createdAt: d(12),         createdByUserId: 'u_mgr'     },
  { id: 'sm_48', productId: 'p_21', quantity:  10, reason: 'ADJUSTMENT', note: 'Transfert wh_1 → wh_2 (stock équilibrage)',createdAt: d(12),         createdByUserId: 'u_mgr'     }
];

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const MOCK_EXPENSES: Expense[] = [
  { id: 'exp_1',  category: 'loyer',      label: 'Loyer boutique – Février 2026',    amount: 150_000, expenseDateIso: '2026-02-01', createdAt: d(98), createdByUserId: 'u_admin', note: 'Loyer mensuel' },
  { id: 'exp_2',  category: 'salaires',   label: 'Salaires personnel – Février 2026', amount: 320_000, expenseDateIso: '2026-02-28', createdAt: d(70), createdByUserId: 'u_admin', note: '4 employés' },
  { id: 'exp_3',  category: 'transport',  label: 'Carburant véhicule livraison',      amount: 18_500,  expenseDateIso: '2026-03-05', createdAt: d(67), createdByUserId: 'u_mgr',   note: 'Remplissage complet' },
  { id: 'exp_4',  category: 'loyer',      label: 'Loyer boutique – Mars 2026',       amount: 150_000, expenseDateIso: '2026-03-01', createdAt: d(66), createdByUserId: 'u_admin', note: 'Loyer mensuel' },
  { id: 'exp_5',  category: 'electricite',label: 'Facture électricité – Mars',       amount: 42_000,  expenseDateIso: '2026-03-15', createdAt: d(57), createdByUserId: 'u_admin', note: 'CIE Abidjan' },
  { id: 'exp_6',  category: 'salaires',   label: 'Salaires personnel – Mars 2026',   amount: 320_000, expenseDateIso: '2026-03-31', createdAt: d(41), createdByUserId: 'u_admin', note: '4 employés' },
  { id: 'exp_7',  category: 'transport',  label: 'Taxi course livraison client',      amount: 3_500,   expenseDateIso: '2026-04-08', createdAt: d(33), createdByUserId: 'u_cashier', note: 'Client Clinique Vision Plus' },
  { id: 'exp_8',  category: 'loyer',      label: 'Loyer boutique – Avril 2026',      amount: 150_000, expenseDateIso: '2026-04-01', createdAt: d(40), createdByUserId: 'u_admin', note: 'Loyer mensuel' },
  { id: 'exp_9',  category: 'maintenance','label': 'Réparation climatiseur boutique', amount: 35_000,  expenseDateIso: '2026-04-20', createdAt: d(21), createdByUserId: 'u_admin', note: 'Technicien Froid CI' },
  { id: 'exp_10', category: 'electricite', label: 'Facture électricité – Avril',       amount: 38_500,  expenseDateIso: '2026-04-30', createdAt: d(11),  createdByUserId: 'u_admin',   note: 'CIE Abidjan' },
  // ── Mois courant (dépenses récentes) ─────────────────────────────────
  { id: 'exp_11', category: 'loyer',       label: 'Loyer boutique – mois courant',    amount: 150_000, expenseDateIso: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10),  createdAt: d(new Date().getDate() - 1 < 1 ? 1 : new Date().getDate() - 1), createdByUserId: 'u_admin',   note: 'Loyer mensuel' },
  { id: 'exp_12', category: 'salaires',    label: 'Salaires personnel – mois courant', amount: 340_000, expenseDateIso: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString().slice(0,10),  createdAt: d(Math.max(1, new Date().getDate() - 5)), createdByUserId: 'u_admin',   note: '4 employés + prime' },
  { id: 'exp_13', category: 'transport',   label: 'Carburant livraison client',       amount: 12_000,  expenseDateIso: new Date(Date.now() - 3*86400000).toISOString().slice(0,10), createdAt: d(3),  createdByUserId: 'u_mgr',     note: 'Deux courses Abidjan' },
  { id: 'exp_14', category: 'fournitures', label: 'Matériel bureau et emballages',    amount: 25_500,  expenseDateIso: new Date(Date.now() - 7*86400000).toISOString().slice(0,10), createdAt: d(7),  createdByUserId: 'u_mgr',     note: 'Sachets, tickets, stylos' },
  { id: 'exp_15', category: 'maintenance', label: 'Entretien climatiseurs boutique',  amount: 22_000,  expenseDateIso: new Date(Date.now() - 10*86400000).toISOString().slice(0,10), createdAt: d(10), createdByUserId: 'u_admin',   note: 'Technicien Froid CI – 2 unités' },
  { id: 'exp_16', category: 'publicite',   label: 'Promotion réseaux sociaux',        amount: 30_000,  expenseDateIso: new Date(Date.now() - 14*86400000).toISOString().slice(0,10), createdAt: d(14), createdByUserId: 'u_mgr',     note: 'Facebook & Instagram' },
  { id: 'exp_17', category: 'electricite', label: 'Facture électricité – mois courant', amount: 41_000, expenseDateIso: new Date(Date.now() - 18*86400000).toISOString().slice(0,10), createdAt: d(18), createdByUserId: 'u_admin',   note: 'CIE Abidjan' },
  { id: 'exp_18', category: 'internet',    label: 'Abonnement Internet + téléphone',  amount: 18_000,  expenseDateIso: new Date(Date.now() - 20*86400000).toISOString().slice(0,10), createdAt: d(20), createdByUserId: 'u_admin',   note: 'Orange Business' },
  { id: 'exp_19', category: 'transport',   label: 'Livraison commande fournisseur',   amount: 8_500,   expenseDateIso: new Date(Date.now() - 22*86400000).toISOString().slice(0,10), createdAt: d(22), createdByUserId: 'u_cashier',  note: 'Transporteur local' },
  { id: 'exp_20', category: 'divers',      label: 'Frais bancaires virements',        amount: 5_000,   expenseDateIso: new Date(Date.now() - 25*86400000).toISOString().slice(0,10), createdAt: d(25), createdByUserId: 'u_admin',   note: 'Commission BICICI' },
  // ── Mois précédents (historique riche) ────────────────────────────
  { id: 'exp_21', category: 'loyer',       label: 'Loyer boutique – Janvier 2026',   amount: 150_000, expenseDateIso: '2026-01-01', createdAt: d(128), createdByUserId: 'u_admin',  note: 'Loyer mensuel' },
  { id: 'exp_22', category: 'salaires',    label: 'Salaires personnel – Janvier 2026', amount: 320_000, expenseDateIso: '2026-01-31', createdAt: d(100), createdByUserId: 'u_admin', note: '4 employés' },
  { id: 'exp_23', category: 'electricite', label: 'Facture électricité – Janvier',   amount: 45_000,  expenseDateIso: '2026-01-20', createdAt: d(110), createdByUserId: 'u_admin',  note: 'CIE Abidjan' },
  { id: 'exp_24', category: 'internet',    label: 'Abonnement Internet – Janvier',   amount: 18_000,  expenseDateIso: '2026-01-05', createdAt: d(125), createdByUserId: 'u_admin',  note: 'Orange Business' },
  { id: 'exp_25', category: 'transport',   label: 'Carburant – Janvier',             amount: 15_000,  expenseDateIso: '2026-01-12', createdAt: d(118), createdByUserId: 'u_mgr',    note: 'Véhicule livraison' },
  { id: 'exp_26', category: 'salaires',    label: 'Salaires personnel – Avril 2026', amount: 340_000, expenseDateIso: '2026-04-05', createdAt: d(36),  createdByUserId: 'u_admin',  note: '4 employés + prime' },
  { id: 'exp_27', category: 'internet',    label: 'Abonnement Internet – Avril',     amount: 18_000,  expenseDateIso: '2026-04-05', createdAt: d(36),  createdByUserId: 'u_admin',  note: 'Orange Business' },
  { id: 'exp_28', category: 'fournitures', label: 'Étiquettes et emballages',        amount: 14_000,  expenseDateIso: '2026-04-12', createdAt: d(29),  createdByUserId: 'u_mgr',    note: 'Papeterie Abidjan' },
  { id: 'exp_29', category: 'publicite',   label: 'Flyers promotionnels imprimés',   amount: 20_000,  expenseDateIso: '2026-04-15', createdAt: d(26),  createdByUserId: 'u_mgr',    note: '500 flyers A5' },
  { id: 'exp_30', category: 'divers',      label: 'Frais expert-comptable',          amount: 60_000,  expenseDateIso: '2026-03-20', createdAt: d(51),  createdByUserId: 'u_admin',  note: 'Déclaration trimestrielle' }
];

// ─── Appointments ─────────────────────────────────────────────────────────────
export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'apt_1', customerName: 'Aminata Traoré',      phone: '+225 05 10 20 30', dateTime: new Date(Date.now() + 2 * 3_600_000).toISOString(),   status: 'SCHEDULED',  note: 'Contrôle de vue annuel' },
  { id: 'apt_2', customerName: 'Kouadio Jean-Pierre', phone: '+225 05 55 44 33', dateTime: new Date(Date.now() + 1 * 86_400_000).toISOString(),  status: 'SCHEDULED',  note: 'Retrait commande montures' },
  { id: 'apt_3', customerName: 'Nadia Ouédraogo',     phone: '+226 70 11 22 33', dateTime: new Date(Date.now() + 2 * 86_400_000).toISOString(),  status: 'SCHEDULED',  note: 'Essayage lentilles colorées' },
  { id: 'apt_4', customerName: 'Yves Aka',            phone: '+225 07 11 22 33', dateTime: new Date(Date.now() + 3 * 86_400_000).toISOString(),  status: 'SCHEDULED',  note: 'Premier rendez-vous' },
  { id: 'apt_5', customerName: 'Mariam Bamba',        phone: '+225 05 34 56 78', dateTime: new Date(Date.now() - 1 * 86_400_000).toISOString(),  status: 'COMPLETED',  note: 'Livraison verres progressifs' },
  { id: 'apt_6', customerName: 'Ibrahim Coulibaly',   phone: '+225 07 77 88 99', dateTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),  status: 'COMPLETED',  note: 'Adaptation lentilles' },
  { id: 'apt_7', customerName: 'Client Walk-in',      phone: '0000000000',       dateTime: new Date(Date.now() - 5 * 86_400_000).toISOString(),  status: 'CANCELLED',  note: 'Annulé – client absent' },
  { id: 'apt_8',  customerName: 'Clinique Vision Plus',  phone: '+225 20 21 00 55', dateTime: new Date(Date.now() + 7  * 86_400_000).toISOString(), status: 'SCHEDULED',  note: 'Commande groupée 12 montures' },
  { id: 'apt_9',  customerName: 'Soumaila Koné',          phone: '+225 07 55 66 77', dateTime: new Date(Date.now() + 4  * 86_400_000 + 2*3600_000).toISOString(),  status: 'SCHEDULED',  note: 'Essayage monture Tom Ford' },
  { id: 'apt_10', customerName: 'Adjoua Diomandé',         phone: '+225 05 77 88 12', dateTime: new Date(Date.now() + 5  * 86_400_000 + 4*3600_000).toISOString(),  status: 'SCHEDULED',  note: 'Contrôle de vue enfant' },
  { id: 'apt_11', customerName: 'Opticiens Réunis SA',     phone: '+225 20 22 33 44', dateTime: new Date(Date.now() + 10 * 86_400_000).toISOString(),               status: 'SCHEDULED',  note: 'Négociation commande grossiste' },
  { id: 'apt_12', customerName: 'Patrice Bogui',           phone: '+225 07 33 44 55', dateTime: new Date(Date.now() + 1  * 86_400_000 + 5*3600_000).toISOString(),  status: 'SCHEDULED',  note: 'Livraison verres progressifs' },
  { id: 'apt_13', customerName: 'Aminata Traoré',          phone: '+225 05 10 20 30', dateTime: new Date(Date.now() + 6  * 86_400_000 + 3*3600_000).toISOString(),  status: 'SCHEDULED',  note: 'Adaptation lentilles mensuelles' },
  { id: 'apt_14', customerName: 'Dr. Bamba Ouattara',      phone: '+225 20 33 55 66', dateTime: new Date(Date.now() + 14 * 86_400_000).toISOString(),               status: 'SCHEDULED',  note: 'Commande institutionnelle Hôpital' },
  { id: 'apt_15', customerName: 'Fatima Kouyaté',          phone: '+225 05 22 33 44', dateTime: new Date(Date.now() + 2  * 86_400_000 + 6*3600_000).toISOString(),  status: 'SCHEDULED',  note: 'Retrait commande montures enfant' },
  { id: 'apt_16', customerName: 'Kouadio Jean-Pierre',     phone: '+225 05 55 44 33', dateTime: new Date(Date.now() - 3  * 86_400_000).toISOString(),               status: 'COMPLETED',  note: 'Ajustement monture livré' },
  { id: 'apt_17', customerName: 'Centre Médical Cocody',   phone: '+225 22 44 00 88', dateTime: new Date(Date.now() - 4  * 86_400_000).toISOString(),               status: 'COMPLETED',  note: 'Commande mensuelle exécutée' },
  { id: 'apt_18', customerName: 'Nadia Ouédraogo',         phone: '+226 70 11 22 33', dateTime: new Date(Date.now() - 6  * 86_400_000).toISOString(),               status: 'COMPLETED',  note: 'Retrait lentilles toriques' },
  { id: 'apt_19', customerName: 'Marius Amoikon',          phone: '+225 07 88 99 00', dateTime: new Date(Date.now() - 7  * 86_400_000).toISOString(),               status: 'CANCELLED',  note: 'Annulé – déplacement client' },
  { id: 'apt_20', customerName: 'Assita Sanogo',           phone: '+225 05 44 55 66', dateTime: new Date(Date.now() - 8  * 86_400_000).toISOString(),               status: 'COMPLETED',  note: 'Contrôle vue post-opération' },
  { id: 'apt_21', customerName: 'Yves Aka',                phone: '+225 07 11 22 33', dateTime: new Date(Date.now() - 10 * 86_400_000).toISOString(),               status: 'CANCELLED',  note: 'Non présenté – relance à faire' },
  { id: 'apt_22', customerName: 'Grossiste Abidjan SA',    phone: '+225 20 33 44 55', dateTime: new Date(Date.now() + 21 * 86_400_000).toISOString(),               status: 'SCHEDULED',  note: 'Présentation nouveaux produits' },
  { id: 'apt_23', customerName: 'Ibrahim Coulibaly',       phone: '+225 07 77 88 99', dateTime: new Date(Date.now() - 12 * 86_400_000).toISOString(),               status: 'COMPLETED',  note: 'Livraison solution entretien' },
  { id: 'apt_24', customerName: 'Association Voir Mieux',  phone: '+225 22 47 50 00', dateTime: new Date(Date.now() + 30 * 86_400_000).toISOString(),               status: 'SCHEDULED',  note: 'Partenariat don de lunettes' }
];
