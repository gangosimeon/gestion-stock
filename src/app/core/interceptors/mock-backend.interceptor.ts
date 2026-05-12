import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import { Appointment } from '../models/appointment.model';
import { Category } from '../models/category.model';
import { Customer } from '../models/customer.model';
import { CustomerPayment } from '../models/customer-payment.model';
import { CashOperation, CashRegisterSession } from '../models/cash-register.model';
import { Expense } from '../models/expense.model';
import { InventorySession } from '../models/inventory.model';
import { Warehouse } from '../models/warehouse.model';
import { DailyReport, MonthlyReport, YearlyReport } from '../models/report.model';
import { Role } from '../models/role.model';
import { Sale } from '../models/sale.model';
import { StockMovement } from '../models/stock-movement.model';
import { Supplier } from '../models/supplier.model';
import { SupplierPurchaseHistory } from '../models/supplier-purchase-history.model';
import { SupplierPayment } from '../models/supplier-payment.model';
import { PurchaseOrder, SupplierInvoice } from '../models/purchase-order.model';
import { User } from '../models/user.model';
import { AuditLogEntry } from '../models/audit-log.model';
import {
  MOCK_USERS, MOCK_WAREHOUSES, MOCK_CATEGORIES, MOCK_PRODUCTS,
  MOCK_SUPPLIERS, MOCK_SUPPLIER_PURCHASES, MOCK_SUPPLIER_PAYMENTS,
  MOCK_CUSTOMERS, MOCK_CUSTOMER_PAYMENTS, MOCK_SALES,
  MOCK_PURCHASE_ORDERS, MOCK_STOCK_MOVEMENTS, MOCK_EXPENSES,
  MOCK_APPOINTMENTS, MOCK_WAREHOUSE_STOCKS
} from '../mocks/mock-db';
import { computeDelayMs } from '../mocks/config/mock.config';
import { signMockJwt, extractUsernameFromToken } from '../mocks/engine/jwt.sim';

type LoginBody = {
  username?: string;
  password?: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

const getDelayMs = computeDelayMs; // driven by mock.config signal

let mockUsers: User[] = [...MOCK_USERS];

const WAREHOUSE_HEADER = 'X-Warehouse-Id';
const DEFAULT_WAREHOUSE_ID = 'wh_1';

function warehouseIdFromReq(req: HttpRequest<unknown>): string {
  return req.headers.get(WAREHOUSE_HEADER) ?? DEFAULT_WAREHOUSE_ID;
}

let mockInventorySessions: InventorySession[] = [];

let mockAuditLogs: AuditLogEntry[] = [];

let mockSeeded = false;

function seedIfNeeded(): void {
  if (mockSeeded) return;
  mockSeeded = true;

  if (mockAuditLogs.length === 0) {
    const now = Date.now();
    mockAuditLogs = [
      { id: 'al_1',  createdAt: new Date(now - 300_000).toISOString(),       userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'LOGIN',  entityType: 'SYSTEM',               entityId: '-',     entityLabel: 'Connexion',                    ipAddress: '192.168.1.10', status: 'SUCCESS', details: 'Connexion réussie' },
      { id: 'al_2',  createdAt: new Date(now - 900_000).toISOString(),       userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'CREATE', entityType: 'SALE',                 entityId: 's_25', entityLabel: 'Vente #025',                   ipAddress: '192.168.1.15', status: 'SUCCESS', details: 'Vente créée – 2 articles, 38 000 FCFA' },
      { id: 'al_3',  createdAt: new Date(now - 1_800_000).toISOString(),     userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'UPDATE', entityType: 'PRODUCT',              entityId: 'p_1',  entityLabel: 'Monture Ray-Ban RB3025',        ipAddress: '192.168.1.20', status: 'SUCCESS', changes: [{ field: 'retailPrice', oldValue: 32000, newValue: 35000 }] },
      { id: 'al_4',  createdAt: new Date(now - 3_600_000).toISOString(),     userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'CREATE', entityType: 'CUSTOMER',             entityId: 'c_10', entityLabel: 'Centre Médical Cocody',           ipAddress: '192.168.1.10', status: 'SUCCESS', details: 'Nouveau client crédit 300 000 FCFA' },
      { id: 'al_5',  createdAt: new Date(now - 5_400_000).toISOString(),     userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'EXPORT', entityType: 'SALE',                 entityId: '-',    entityLabel: 'Export ventes avril 2026',      ipAddress: '192.168.1.25', status: 'SUCCESS', details: 'Export CSV – 25 ventes' },
      { id: 'al_6',  createdAt: new Date(now - 7_200_000).toISOString(),     userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CREATE', entityType: 'PURCHASE_ORDER',       entityId: 'po_8', entityLabel: 'Cmd #PO-008 Luxottica',        ipAddress: '192.168.1.20', status: 'SUCCESS' },
      { id: 'al_7',  createdAt: new Date(now - 10_800_000).toISOString(),    userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'UPDATE', entityType: 'USER',                 entityId: 'u_cashier2', entityLabel: 'Fatou Sow',               ipAddress: '192.168.1.10', status: 'SUCCESS', changes: [{ field: 'magasin', oldValue: 'Magasin Principal', newValue: 'Dépôt Secondaire' }] },
      { id: 'al_8',  createdAt: new Date(now - 14_400_000).toISOString(),    userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'OPEN',   entityType: 'CASH_REGISTER_SESSION', entityId: 'cs_1', entityLabel: 'Session caisse – Pierre D.',    ipAddress: '192.168.1.15', status: 'SUCCESS' },
      { id: 'al_9',  createdAt: new Date(now - 18_000_000).toISOString(),    userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'RECEIVE',entityType: 'PURCHASE_ORDER',       entityId: 'po_7', entityLabel: 'Réception Cmd #PO-007',          ipAddress: '192.168.1.20', status: 'SUCCESS', details: '120 articles réceptionnés en stock' },
      { id: 'al_10', createdAt: new Date(now - 21_600_000).toISOString(),    userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'LOGIN',  entityType: 'SYSTEM',               entityId: '-',    entityLabel: 'Connexion',                    ipAddress: '10.0.0.5',    status: 'FAILURE', details: 'Mot de passe incorrect' },
      { id: 'al_11', createdAt: new Date(now - 86_400_000).toISOString(),    userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'CREATE', entityType: 'SALE',                 entityId: 's_24', entityLabel: 'Vente #024',                   ipAddress: '192.168.1.25', status: 'SUCCESS' },
      { id: 'al_12', createdAt: new Date(now - 90_000_000).toISOString(),    userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'TRANSFER',entityType: 'STOCK_MOVEMENT',      entityId: 'sm_19',entityLabel: 'Transfert wh_1 → wh_2',          ipAddress: '192.168.1.20', status: 'SUCCESS', details: '10 unités Lentilles Journalières' },
      { id: 'al_13', createdAt: new Date(now - 172_800_000).toISOString(),   userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'CREATE', entityType: 'PRODUCT',              entityId: 'p_11', entityLabel: 'Lentilles Colorées Alcon',        ipAddress: '192.168.1.10', status: 'SUCCESS' },
      { id: 'al_14', createdAt: new Date(now - 180_000_000).toISOString(),   userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'PAY',    entityType: 'CUSTOMER_PAYMENT',     entityId: 'cp_7', entityLabel: 'Paiement Optique Pro Dakar',    ipAddress: '192.168.1.15', status: 'SUCCESS', details: 'Paiement 80 000 FCFA' },
      { id: 'al_15', createdAt: new Date(now - 259_200_000).toISOString(),   userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'DELETE', entityType: 'PRODUCT',              entityId: 'p_old',entityLabel: 'Ancien produit (archivé)',        ipAddress: '192.168.1.10', status: 'FAILURE', details: 'Produit lié à des ventes existantes' },
      { id: 'al_16', createdAt: new Date(now - 345_600_000).toISOString(),   userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CLOSE',  entityType: 'INVENTORY_SESSION',    entityId: 'inv_1',entityLabel: 'Inventaire #001',              ipAddress: '192.168.1.20', status: 'SUCCESS', details: 'Inventaire clôturé, 2 écarts détectés' },
      { id: 'al_17', createdAt: new Date(now - 400_000_000).toISOString(),   userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'LOGOUT', entityType: 'SYSTEM',               entityId: '-',    entityLabel: 'Déconnexion',                      ipAddress: '192.168.1.15', status: 'SUCCESS' },
      { id: 'al_18', createdAt: new Date(now - 500_000_000).toISOString(),   userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'EXPORT',   entityType: 'REPORT',               entityId: '-',      entityLabel: 'Export rapport mensuel avr.',       ipAddress: '192.168.1.10', status: 'SUCCESS', details: 'Export PDF rapport mensuel avril 2026' },
      { id: 'al_19', createdAt: new Date(now - 600_000_000).toISOString(),   userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CREATE',   entityType: 'PRODUCT',              entityId: 'p_16',   entityLabel: 'Monture Tom Ford TF5823',           ipAddress: '192.168.1.20', status: 'SUCCESS', details: 'Nouveau produit ajouté – cat. Montures' },
      { id: 'al_20', createdAt: new Date(now - 650_000_000).toISOString(),   userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CREATE',   entityType: 'PRODUCT',              entityId: 'p_17',   entityLabel: 'Monture Ray-Ban Aviator Classic',   ipAddress: '192.168.1.20', status: 'SUCCESS' },
      { id: 'al_21', createdAt: new Date(now - 700_000_000).toISOString(),   userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'UPDATE',   entityType: 'PRODUCT',              entityId: 'p_6',    entityLabel: 'Verre Progressif Premium',          ipAddress: '192.168.1.20', status: 'SUCCESS', changes: [{ field: 'alertThreshold', oldValue: 3, newValue: 5 }] },
      { id: 'al_22', createdAt: new Date(now - 720_000_000).toISOString(),   userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'CREATE',   entityType: 'SALE',                 entityId: 's_45',   entityLabel: 'Vente #045 – 181 000 FCFA',         ipAddress: '192.168.1.25', status: 'SUCCESS', details: '2 articles, client Yves Aka' },
      { id: 'al_23', createdAt: new Date(now - 750_000_000).toISOString(),   userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'CREATE',   entityType: 'SALE',                 entityId: 's_43',   entityLabel: 'Vente #043 – 81 000 FCFA',          ipAddress: '192.168.1.15', status: 'SUCCESS' },
      { id: 'al_24', createdAt: new Date(now - 800_000_000).toISOString(),   userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'CREATE',   entityType: 'CUSTOMER',             entityId: 'c_13',   entityLabel: "Hôpital Général d'Abobo",           ipAddress: '192.168.1.10', status: 'SUCCESS', details: 'Nouveau client institutionnel crédit 1 500 000 FCFA' },
      { id: 'al_25', createdAt: new Date(now - 850_000_000).toISOString(),   userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'CREATE',   entityType: 'CUSTOMER',             entityId: 'c_11',   entityLabel: 'Opticiens Réunis SA',               ipAddress: '192.168.1.10', status: 'SUCCESS' },
      { id: 'al_26', createdAt: new Date(now - 900_000_000).toISOString(),   userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'RECEIVE',  entityType: 'PURCHASE_ORDER',       entityId: 'po_9',   entityLabel: 'Réception Cmd #PO-009 Essilor',     ipAddress: '192.168.1.20', status: 'SUCCESS', details: '135 articles réceptionnés' },
      { id: 'al_27', createdAt: new Date(now - 950_000_000).toISOString(),   userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CREATE',   entityType: 'PURCHASE_ORDER',       entityId: 'po_9',   entityLabel: 'Cmd #PO-009 Essilor',               ipAddress: '192.168.1.20', status: 'SUCCESS', details: 'Commande 4 références – 1 015 000 FCFA' },
      { id: 'al_28', createdAt: new Date(now - 1_000_000_000).toISOString(), userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'OPEN',     entityType: 'CASH_REGISTER_SESSION',entityId: 'cs_3',   entityLabel: 'Session caisse – Pierre D.',        ipAddress: '192.168.1.15', status: 'SUCCESS', details: 'Solde ouverture : 20 000 FCFA' },
      { id: 'al_29', createdAt: new Date(now - 1_050_000_000).toISOString(), userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'CLOSE',    entityType: 'CASH_REGISTER_SESSION',entityId: 'cs_2',   entityLabel: 'Clôture session caisse',            ipAddress: '192.168.1.15', status: 'SUCCESS', details: 'Solde clôture : 347 500 FCFA' },
      { id: 'al_30', createdAt: new Date(now - 1_100_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'TRANSFER', entityType: 'STOCK_MOVEMENT',       entityId: 'sm_43',  entityLabel: 'Transfert wh_1 → wh_2 (VER-UNI)',  ipAddress: '192.168.1.20', status: 'SUCCESS', details: '5 unités Verre Unifocal Sphérique' },
      { id: 'al_31', createdAt: new Date(now - 1_200_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'UPDATE',   entityType: 'USER',                 entityId: 'u_mgr',  entityLabel: 'Marie Kouamé',                      ipAddress: '192.168.1.10', status: 'SUCCESS', changes: [{ field: 'roles', oldValue: 'CAISSIER', newValue: 'GESTIONNAIRE' }] },
      { id: 'al_32', createdAt: new Date(now - 1_250_000_000).toISOString(), userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'LOGOUT',   entityType: 'SYSTEM',               entityId: '-',      entityLabel: 'Déconnexion',                       ipAddress: '192.168.1.25', status: 'SUCCESS' },
      { id: 'al_33', createdAt: new Date(now - 1_300_000_000).toISOString(), userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'LOGIN',    entityType: 'SYSTEM',               entityId: '-',      entityLabel: 'Connexion',                         ipAddress: '192.168.1.25', status: 'SUCCESS', details: 'Connexion réussie – session démarrée' },
      { id: 'al_34', createdAt: new Date(now - 1_400_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CREATE',   entityType: 'INVENTORY_SESSION',    entityId: 'inv_2',  entityLabel: 'Inventaire #002',                   ipAddress: '192.168.1.20', status: 'SUCCESS', details: '15 produits comptés' },
      { id: 'al_35', createdAt: new Date(now - 1_450_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'CLOSE',    entityType: 'INVENTORY_SESSION',    entityId: 'inv_2',  entityLabel: 'Inventaire #002 – clôture',         ipAddress: '192.168.1.20', status: 'SUCCESS', details: '3 écarts détectés – ajustements appliqués' },
      { id: 'al_36', createdAt: new Date(now - 1_500_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'PAY',      entityType: 'SUPPLIER_PAYMENT',     entityId: 'spay_9', entityLabel: 'Paiement Luxottica PO-010',         ipAddress: '192.168.1.10', status: 'SUCCESS', details: 'Virement bancaire 609 000 FCFA' },
      { id: 'al_37', createdAt: new Date(now - 1_550_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'PAY',      entityType: 'SUPPLIER_PAYMENT',     entityId: 'spay_8', entityLabel: 'Paiement Essilor PO-009',           ipAddress: '192.168.1.10', status: 'SUCCESS', details: 'Virement bancaire 1 015 000 FCFA' },
      { id: 'al_38', createdAt: new Date(now - 1_600_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'RECEIVE',  entityType: 'PURCHASE_ORDER',       entityId: 'po_10',  entityLabel: 'Réception Cmd #PO-010 Luxottica',   ipAddress: '192.168.1.20', status: 'SUCCESS', details: '155 articles réceptionnés' },
      { id: 'al_39', createdAt: new Date(now - 1_700_000_000).toISOString(), userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'CREATE',   entityType: 'SALE',                 entityId: 's_39',   entityLabel: 'Vente #039 – 91 000 FCFA',          ipAddress: '192.168.1.15', status: 'SUCCESS' },
      { id: 'al_40', createdAt: new Date(now - 1_800_000_000).toISOString(), userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'CREATE',   entityType: 'SALE',                 entityId: 's_40',   entityLabel: 'Vente #040 – 330 000 FCFA',         ipAddress: '192.168.1.25', status: 'SUCCESS', details: 'Vente en gros – Hôpital Général Abobo' },
      { id: 'al_41', createdAt: new Date(now - 1_900_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'DELETE',   entityType: 'EXPENSE',              entityId: 'exp_old',entityLabel: 'Dépense doublon supprimée',         ipAddress: '192.168.1.10', status: 'SUCCESS' },
      { id: 'al_42', createdAt: new Date(now - 2_000_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'UPDATE',   entityType: 'PRODUCT',              entityId: 'p_8',    entityLabel: 'Verre Photochromique Transitions',  ipAddress: '192.168.1.20', status: 'SUCCESS', changes: [{ field: 'stockQuantity', oldValue: 4, newValue: 7 }] },
      { id: 'al_43', createdAt: new Date(now - 2_100_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'CREATE',   entityType: 'EXPENSE',              entityId: 'exp_26', entityLabel: 'Salaires Avril 2026',               ipAddress: '192.168.1.10', status: 'SUCCESS' },
      { id: 'al_44', createdAt: new Date(now - 2_200_000_000).toISOString(), userId: 'u_cashier', username: 'pierre_d', userRole: 'CAISSIER',    action: 'PAY',      entityType: 'CUSTOMER_PAYMENT',     entityId: 'cp_8',   entityLabel: 'Paiement Opticiens Réunis SA',      ipAddress: '192.168.1.15', status: 'SUCCESS', details: 'Paiement 200 000 FCFA' },
      { id: 'al_45', createdAt: new Date(now - 2_300_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'LOGIN',    entityType: 'SYSTEM',               entityId: '-',      entityLabel: 'Connexion',                         ipAddress: '192.168.1.10', status: 'SUCCESS' },
      { id: 'al_46', createdAt: new Date(now - 2_400_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'EXPORT',   entityType: 'SALE',                 entityId: '-',      entityLabel: 'Export ventes mars 2026',           ipAddress: '192.168.1.20', status: 'SUCCESS', details: 'Export CSV – 18 ventes' },
      { id: 'al_47', createdAt: new Date(now - 2_500_000_000).toISOString(), userId: 'u_cashier2',username: 'fatou_s',  userRole: 'CAISSIER',    action: 'OPEN',     entityType: 'CASH_REGISTER_SESSION',entityId: 'cs_4',   entityLabel: 'Session caisse – Fatou S.',         ipAddress: '192.168.1.25', status: 'SUCCESS' },
      { id: 'al_48', createdAt: new Date(now - 2_600_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'UPDATE',   entityType: 'SUPPLIER',             entityId: 'sup_3',  entityLabel: 'CooperVision Afrique',              ipAddress: '192.168.1.10', status: 'SUCCESS', changes: [{ field: 'phone', oldValue: '+225 20 21 22 30', newValue: '+225 20 21 22 31' }] },
      { id: 'al_49', createdAt: new Date(now - 2_700_000_000).toISOString(), userId: 'u_admin',   username: 'admin',    userRole: 'ADMIN',       action: 'LOGIN',    entityType: 'SYSTEM',               entityId: '-',      entityLabel: 'Tentative de connexion refusée',    ipAddress: '10.0.0.99',    status: 'FAILURE', details: 'IP inconnue – compte bloqué temporairement' },
      { id: 'al_50', createdAt: new Date(now - 2_800_000_000).toISOString(), userId: 'u_mgr',     username: 'marie_k',  userRole: 'GESTIONNAIRE', action: 'UPDATE',   entityType: 'WAREHOUSE',            entityId: 'wh_2',   entityLabel: 'Dépôt Secondaire',                  ipAddress: '192.168.1.20', status: 'SUCCESS', changes: [{ field: 'name', oldValue: 'Entrepôt B', newValue: 'Dépôt Secondaire' }] }
    ] as AuditLogEntry[];
  }

  if (mockInventorySessions.length === 0) {
    const wh = DEFAULT_WAREHOUSE_ID;
    const p1 = mockProducts[0];
    const p2 = mockProducts[1];

    const lines: InventorySession['lines'] = [
      {
        productId: p1.id,
        productSku: p1.sku,
        productName: p1.name,
        systemQuantity: getStock(wh, p1.id),
        physicalQuantity: getStock(wh, p1.id),
        difference: 0
      },
      {
        productId: p2.id,
        productSku: p2.sku,
        productName: p2.name,
        systemQuantity: getStock(wh, p2.id),
        physicalQuantity: Math.max(0, getStock(wh, p2.id) - 1),
        difference: Math.max(0, getStock(wh, p2.id) - 1) - getStock(wh, p2.id)
      }
    ];

    const itemsCount = lines.length;
    const totalDifference = lines.reduce((acc, l) => acc + l.difference, 0);

    const allProducts = mockProducts.slice(0, 8);
    const lines2: InventorySession['lines'] = allProducts.map((pp, i) => {
      const sys = getStock(wh, pp.id);
      const phy = i % 5 === 0 ? Math.max(0, sys - 1) : sys;
      return { productId: pp.id, productSku: pp.sku, productName: pp.name, systemQuantity: sys, physicalQuantity: phy, difference: phy - sys };
    });
    const lines3: InventorySession['lines'] = mockProducts.slice(0, 12).map((pp, i) => {
      const sys = getStock(wh, pp.id);
      const phy = i % 4 === 0 ? Math.max(0, sys - 2) : sys;
      return { productId: pp.id, productSku: pp.sku, productName: pp.name, systemQuantity: sys, physicalQuantity: phy, difference: phy - sys };
    });
    mockInventorySessions = [
      {
        id: 'inv_1',
        createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
        createdByUserId: 'u_mgr',
        note: `Inventaire auto-généré (${wh})`,
        lines,
        itemsCount: lines.length,
        totalDifference: lines.reduce((a, l) => a + l.difference, 0)
      },
      {
        id: 'inv_2',
        createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
        createdByUserId: 'u_mgr',
        note: 'Inventaire mensuel – produits verres',
        lines: lines2,
        itemsCount: lines2.length,
        totalDifference: lines2.reduce((a, l) => a + l.difference, 0)
      },
      {
        id: 'inv_3',
        createdAt: new Date(Date.now() - 62 * 86400_000).toISOString(),
        createdByUserId: 'u_mgr',
        note: 'Inventaire trimestriel complet wh_1',
        lines: lines3,
        itemsCount: lines3.length,
        totalDifference: lines3.reduce((a, l) => a + l.difference, 0)
      },
      {
        id: 'inv_4',
        createdAt: new Date(Date.now() - 95 * 86400_000).toISOString(),
        createdByUserId: 'u_admin',
        note: 'Inventaire début de trimestre – audit',
        lines: mockProducts.slice(0, 5).map(pp => ({ productId: pp.id, productSku: pp.sku, productName: pp.name, systemQuantity: getStock(wh, pp.id), physicalQuantity: getStock(wh, pp.id), difference: 0 })),
        itemsCount: 5,
        totalDifference: 0
      }
    ];
  }

  if (mockCashSessions.length === 0) {
    const D = (dAgo: number, h = 8): string => new Date(Date.now() - dAgo * 86_400_000 - (9 - h) * 3_600_000).toISOString();
    mockCashSessions = [
      computeCashSessionSummary({ id: 'cs_1', openedAt: new Date(Date.now() - 6 * 3600_000).toISOString(), openedByUserId: 'u_cashier',  openingBalance: 20_000, status: 'OPEN'   } as CashRegisterSession),
      computeCashSessionSummary({ id: 'cs_2', openedAt: D(1, 8), closedAt: D(1, 18), openedByUserId: 'u_cashier',  closedByUserId: 'u_cashier',  openingBalance: 15_000, countedCash: 287_500, status: 'CLOSED' } as CashRegisterSession),
      computeCashSessionSummary({ id: 'cs_3', openedAt: D(2, 8), closedAt: D(2, 19), openedByUserId: 'u_cashier2', closedByUserId: 'u_cashier2', openingBalance: 10_000, countedCash: 195_200, status: 'CLOSED' } as CashRegisterSession),
      computeCashSessionSummary({ id: 'cs_4', openedAt: D(3, 8), closedAt: D(3, 18), openedByUserId: 'u_cashier',  closedByUserId: 'u_cashier',  openingBalance: 20_000, countedCash: 323_700, status: 'CLOSED' } as CashRegisterSession),
      computeCashSessionSummary({ id: 'cs_5', openedAt: D(5, 8), closedAt: D(5, 18), openedByUserId: 'u_cashier2', closedByUserId: 'u_cashier2', openingBalance: 10_000, countedCash: 108_400, status: 'CLOSED' } as CashRegisterSession),
      computeCashSessionSummary({ id: 'cs_6', openedAt: D(7, 8), closedAt: D(7, 18), openedByUserId: 'u_cashier',  closedByUserId: 'u_cashier',  openingBalance: 15_000, countedCash: 247_000, status: 'CLOSED' } as CashRegisterSession)
    ];
  }

  if (mockCashOperations.length === 0) {
    const D = (dAgo: number, h = 10): string => new Date(Date.now() - dAgo * 86_400_000 - (10 - h) * 3_600_000).toISOString();
    mockCashOperations = [
      { id: 'co_01', sessionId: 'cs_1', type: 'OUT', amount: 12_000, note: 'Carburant livraison',          createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),  createdByUserId: 'u_cashier'  },
      { id: 'co_02', sessionId: 'cs_1', type: 'IN',  amount: 5_000,  note: 'Monnaie appoint caisse',       createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),  createdByUserId: 'u_cashier'  },
      { id: 'co_03', sessionId: 'cs_1', type: 'OUT', amount: 3_500,  note: 'Taxi livraison client',        createdAt: new Date(Date.now() - 1 * 3600_000).toISOString(),  createdByUserId: 'u_cashier'  },
      { id: 'co_04', sessionId: 'cs_2', type: 'OUT', amount: 8_000,  note: 'Achat fournitures bureau',     createdAt: D(1, 10),  createdByUserId: 'u_cashier'  },
      { id: 'co_05', sessionId: 'cs_2', type: 'OUT', amount: 2_500,  note: 'Repas équipe',                 createdAt: D(1, 13),  createdByUserId: 'u_cashier'  },
      { id: 'co_06', sessionId: 'cs_2', type: 'IN',  amount: 10_000, note: 'Complément monnaie',           createdAt: D(1, 15),  createdByUserId: 'u_cashier'  },
      { id: 'co_07', sessionId: 'cs_3', type: 'OUT', amount: 5_000,  note: 'Transport coursier',           createdAt: D(2, 9),   createdByUserId: 'u_cashier2' },
      { id: 'co_08', sessionId: 'cs_3', type: 'OUT', amount: 1_800,  note: 'Nettoyage boutique',           createdAt: D(2, 14),  createdByUserId: 'u_cashier2' },
      { id: 'co_09', sessionId: 'cs_4', type: 'OUT', amount: 15_000, note: 'Électricité – paiement CIE',   createdAt: D(3, 11),  createdByUserId: 'u_cashier'  },
      { id: 'co_10', sessionId: 'cs_4', type: 'IN',  amount: 20_000, note: 'Fond de caisse ajout',         createdAt: D(3, 8),   createdByUserId: 'u_cashier'  },
      { id: 'co_11', sessionId: 'cs_4', type: 'OUT', amount: 3_200,  note: 'Cafétéria personnel',          createdAt: D(3, 12),  createdByUserId: 'u_cashier'  },
      { id: 'co_12', sessionId: 'cs_5', type: 'OUT', amount: 6_500,  note: 'Internet boutique mensuel',    createdAt: D(5, 10),  createdByUserId: 'u_cashier2' },
      { id: 'co_13', sessionId: 'cs_5', type: 'OUT', amount: 4_000,  note: 'Frais de port colis',          createdAt: D(5, 14),  createdByUserId: 'u_cashier2' },
      { id: 'co_14', sessionId: 'cs_6', type: 'OUT', amount: 10_000, note: 'Achats divers boutique',       createdAt: D(7, 9),   createdByUserId: 'u_cashier'  },
      { id: 'co_15', sessionId: 'cs_6', type: 'IN',  amount: 15_000, note: 'Apport fond de roulement',     createdAt: D(7, 8),   createdByUserId: 'u_cashier'  }
    ];
  }
}

function appendAudit(entry: Partial<AuditLogEntry> & Pick<AuditLogEntry, 'userId' | 'username' | 'action' | 'entityType' | 'entityId'>): void {
  mockAuditLogs = [
    {
      id: `al_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
      createdAt: new Date().toISOString(),
      userRole: entry.userRole ?? 'ADMIN',
      entityLabel: entry.entityLabel ?? entry.entityId,
      ipAddress: entry.ipAddress ?? '127.0.0.1',
      status: entry.status ?? 'SUCCESS',
      ...entry
    } as AuditLogEntry,
    ...mockAuditLogs
  ].slice(0, 500);
}

let mockExpenses: Expense[] = [...MOCK_EXPENSES];

let mockSupplierPayments: SupplierPayment[] = [...MOCK_SUPPLIER_PAYMENTS];

let mockPurchaseOrders: PurchaseOrder[] = [...MOCK_PURCHASE_ORDERS];

let mockSuppliers: Supplier[] = [...MOCK_SUPPLIERS];

let mockSupplierPurchases: SupplierPurchaseHistory[] = [...MOCK_SUPPLIER_PURCHASES];

let mockCustomers: Customer[] = [...MOCK_CUSTOMERS];

let mockCustomerPayments: CustomerPayment[] = [...MOCK_CUSTOMER_PAYMENTS];

let mockCashSessions: CashRegisterSession[] = [];
let mockCashOperations: CashOperation[] = [];

function computeCashSessionSummary(session: CashRegisterSession): CashRegisterSession {
  const openedTs = Date.parse(session.openedAt);
  const closedTs = session.closedAt ? Date.parse(session.closedAt) : Number.NaN;
  const endTs = Number.isNaN(closedTs) ? Date.now() : closedTs;

  const cashSalesTotal = mockSales
    .filter((s) => s.paymentMethod === 'CASH')
    .filter((s) => {
      const ts = Date.parse(s.createdAt);
      return ts >= openedTs && ts <= endTs;
    })
    .reduce((acc, s) => acc + (Number(s.paidAmount) || 0), 0);

  const ops = mockCashOperations.filter((o) => o.sessionId === session.id);
  const totalIn = ops.filter((o) => o.type === 'IN').reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  const totalOut = ops.filter((o) => o.type === 'OUT').reduce((acc, o) => acc + (Number(o.amount) || 0), 0);

  const expectedCash = (Number(session.openingBalance) || 0) + cashSalesTotal + totalIn - totalOut;
  const counted = Number(session.countedCash ?? expectedCash);
  const difference = counted - expectedCash;

  return {
    ...session,
    cashSalesTotal,
    totalIn,
    totalOut,
    expectedCash,
    difference
  };
}

let mockAppointments: Appointment[] = [...MOCK_APPOINTMENTS];

let mockStockMovements: StockMovement[] = [...MOCK_STOCK_MOVEMENTS];

let mockSales: Sale[] = [...MOCK_SALES];

let mockProducts: Product[] = [...MOCK_PRODUCTS];

let mockWarehouses: Warehouse[] = [...MOCK_WAREHOUSES];

let mockWarehouseStocks: Record<string, Record<string, number>> = {
  wh_1: { ...MOCK_WAREHOUSE_STOCKS['wh_1'] },
  wh_2: { ...MOCK_WAREHOUSE_STOCKS['wh_2'] }
};

function getStock(warehouseId: string, productId: string): number {
  return Number(mockWarehouseStocks[warehouseId]?.[productId] ?? 0);
}

function setStock(warehouseId: string, productId: string, quantity: number): void {
  if (!mockWarehouseStocks[warehouseId]) mockWarehouseStocks[warehouseId] = {};
  mockWarehouseStocks[warehouseId][productId] = quantity;
}

function adjustStock(warehouseId: string, productId: string, delta: number): number {
  const next = getStock(warehouseId, productId) + delta;
  setStock(warehouseId, productId, next);
  return next;
}

const mockCategories: Category[] = [...MOCK_CATEGORIES];

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
  // JWT format (3 base64url parts separated by '.')
  if (token.split('.').length === 3) {
    const username = extractUsernameFromToken(token);
    if (!username) return null;
    return mockUsers.find((u) => u.username === username) ?? null;
  }
  // Legacy format: mock-token::<username>
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
  seedIfNeeded();

  // Audit logs - stats
  if (url.endsWith('/api/audit-logs/stats') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN'])) return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const totalToday = mockAuditLogs.filter(l => new Date(l.createdAt) >= todayStart).length;
    const failuresLast7Days = mockAuditLogs.filter(l => l.status === 'FAILURE' && new Date(l.createdAt) >= sevenDaysAgo).length;
    const userCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    mockAuditLogs.forEach(l => { userCounts[l.username] = (userCounts[l.username] || 0) + 1; actionCounts[l.action] = (actionCounts[l.action] || 0) + 1; });
    const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
    const mostFrequentAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'CREATE';

    return of(jsonResponse({ totalToday, failuresLast7Days, mostActiveUser, mostFrequentAction })).pipe(delay(getDelayMs()));
  }

  // Audit logs - export CSV
  if (url.endsWith('/api/audit-logs/export') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN'])) return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));

    const header = 'Date;Utilisateur;Rôle;Action;Entité;ID Entité;Label;IP;Statut;Détails\n';
    const rows = mockAuditLogs.map(l => `${l.createdAt};${l.username};${l.userRole};${l.action};${l.entityType};${l.entityId};${l.entityLabel};${l.ipAddress};${l.status};${l.details || ''}`).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    return of(new HttpResponse({ status: 200, body: blob })).pipe(delay(getDelayMs()));
  }

  // Audit logs - detail by ID
  if (url.match(/\/api\/audit-logs\/[^/]+$/) && req.method === 'GET' && !url.endsWith('/stats') && !url.endsWith('/export')) {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN'])) return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));

    const id = url.split('/').pop()!;
    const log = mockAuditLogs.find(l => l.id === id);
    if (!log) return httpError(404, 'Log non trouvé.').pipe(delay(getDelayMs()));
    return of(jsonResponse(log)).pipe(delay(getDelayMs()));
  }

  // Audit logs - list with filters
  if (url.endsWith('/api/audit-logs') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN'])) return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));

    let filtered = [...mockAuditLogs];
    const params = req.params;
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');
    const actions = params.get('actions');
    const entityTypes = params.get('entityTypes');
    const userId = params.get('userId');
    const status = params.get('status');
    const search = params.get('search');

    if (dateFrom) filtered = filtered.filter(l => new Date(l.createdAt) >= new Date(dateFrom));
    if (dateTo) filtered = filtered.filter(l => new Date(l.createdAt) <= new Date(dateTo));
    if (actions) { const arr = actions.split(','); filtered = filtered.filter(l => arr.includes(l.action)); }
    if (entityTypes) { const arr = entityTypes.split(','); filtered = filtered.filter(l => arr.includes(l.entityType)); }
    if (userId) filtered = filtered.filter(l => l.userId === userId);
    if (status) filtered = filtered.filter(l => l.status === status);
    if (search) { const s = search.toLowerCase(); filtered = filtered.filter(l => l.username.toLowerCase().includes(s) || l.entityLabel.toLowerCase().includes(s) || (l.details || '').toLowerCase().includes(s)); }

    const page = parseInt(params.get('page') || '0', 10);
    const size = parseInt(params.get('size') || '25', 10);
    const total = filtered.length;
    const items = filtered.slice(page * size, (page + 1) * size);

    return of(jsonResponse({ items, total })).pipe(delay(getDelayMs()));
  }

  // Auth
  if (url.endsWith('/api/auth/login') && req.method === 'POST') {
    const body = (req.body ?? {}) as LoginBody;
    const username = String(body.username ?? '');
    const password = String(body.password ?? '');

    // Règle simple pour dev : password = "admin" pour tous
    if (!username || !password) return httpError(400, 'Identifiants requis.').pipe(delay(getDelayMs()));

    const user = mockUsers.find((u) => u.username === username);
    if (!user) return httpError(401, 'Utilisateur inconnu.').pipe(delay(getDelayMs()));

    if (password !== 'admin') return httpError(401, 'Mot de passe invalide.').pipe(delay(getDelayMs()));

    const { accessToken, refreshToken, expiresIn } = signMockJwt(user);
    const response: LoginResponse = { accessToken, refreshToken, expiresIn, user };
    return of(jsonResponse(response)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/auth/refresh') && req.method === 'POST') {
    const body = (req.body ?? {}) as { refreshToken?: string };
    const refreshToken = String(body.refreshToken ?? '');
    // Support JWT (3-part) and legacy mock-refresh:: format
    let uname: string | null = null;
    if (refreshToken.split('.').length === 3) {
      uname = extractUsernameFromToken(refreshToken);
    } else if (refreshToken.startsWith('mock-refresh::')) {
      uname = refreshToken.replace('mock-refresh::', '');
    }
    if (!uname) return httpError(401, 'Refresh token invalide.').pipe(delay(getDelayMs()));
    const user = mockUsers.find((u) => u.username === uname);
    if (!user) return httpError(401, 'Session expirée.').pipe(delay(getDelayMs()));
    const { accessToken: newAt, refreshToken: newRt, expiresIn: newExp } = signMockJwt(user);
    const refreshResponse: LoginResponse = { accessToken: newAt, refreshToken: newRt, expiresIn: newExp, user };
    return of(jsonResponse(refreshResponse)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/auth/forgot-password') && req.method === 'POST') {
    const body = (req.body ?? {}) as { email?: string };
    const email = String(body.email ?? '');
    const user = mockUsers.find((u) => u.email === email);
    if (!user) return httpError(404, 'Aucun compte associé à cet email.').pipe(delay(getDelayMs()));
    return of(jsonResponse({ message: 'Email de réinitialisation envoyé.' })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/auth/me') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    return of(jsonResponse(user)).pipe(delay(getDelayMs()));
  }

  // Products
  if (url.endsWith('/api/products') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const warehouseId = warehouseIdFromReq(req);
    const items = mockProducts.map((p) => ({ ...p, stockQuantity: getStock(warehouseId, p.id) }));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/products\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const id = url.split('/').pop() as string;
    const product = mockProducts.find((p) => p.id === id);
    if (!product) return httpError(404, 'Produit introuvable.').pipe(delay(getDelayMs()));

    const warehouseId = warehouseIdFromReq(req);
    return of(jsonResponse({ ...product, stockQuantity: getStock(warehouseId, id) })).pipe(delay(getDelayMs()));
  }

  // Warehouses
  if (url.endsWith('/api/warehouses') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    return of(jsonResponse({ items: mockWarehouses, total: mockWarehouses.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/warehouses') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const body = (req.body ?? {}) as { name?: string };
    const name = String(body.name ?? '').trim();
    if (!name) return httpError(400, 'Nom requis.').pipe(delay(getDelayMs()));
    if (mockWarehouses.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      return httpError(400, 'Nom déjà utilisé.').pipe(delay(getDelayMs()));
    }

    const created: Warehouse = { id: `wh_${Date.now()}`, name };
    mockWarehouses = [...mockWarehouses, created];

    for (const p of mockProducts) {
      setStock(created.id, p.id, 0);
    }

    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/warehouses/transfer') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const body = (req.body ?? {}) as { fromWarehouseId?: string; toWarehouseId?: string; productId?: string; quantity?: number };
    const fromWarehouseId = String(body.fromWarehouseId ?? '').trim();
    const toWarehouseId = String(body.toWarehouseId ?? '').trim();
    const productId = String(body.productId ?? '').trim();
    const quantity = Number(body.quantity ?? 0);

    if (!fromWarehouseId || !toWarehouseId) return httpError(400, 'Magasin requis.').pipe(delay(getDelayMs()));
    if (fromWarehouseId === toWarehouseId) return httpError(400, 'Magasins identiques.').pipe(delay(getDelayMs()));
    if (!productId) return httpError(400, 'Produit requis.').pipe(delay(getDelayMs()));
    if (!Number.isFinite(quantity) || quantity <= 0) return httpError(400, 'Quantité invalide.').pipe(delay(getDelayMs()));

    if (!mockWarehouses.some((w) => w.id === fromWarehouseId) || !mockWarehouses.some((w) => w.id === toWarehouseId)) {
      return httpError(400, 'Magasin invalide.').pipe(delay(getDelayMs()));
    }

    const p = mockProducts.find((x) => x.id === productId);
    if (!p) return httpError(404, 'Produit introuvable.').pipe(delay(getDelayMs()));

    const available = getStock(fromWarehouseId, productId);
    if (available - quantity < 0) return httpError(400, 'Stock insuffisant.').pipe(delay(getDelayMs()));

    adjustStock(fromWarehouseId, productId, -quantity);
    adjustStock(toWarehouseId, productId, quantity);

    const outMovement: StockMovement = {
      id: `sm_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
      productId,
      quantity: -quantity,
      reason: 'ADJUSTMENT',
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
      note: `Transfert ${fromWarehouseId} -> ${toWarehouseId}`
    };
    const inMovement: StockMovement = {
      id: `sm_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
      productId,
      quantity,
      reason: 'ADJUSTMENT',
      createdAt: outMovement.createdAt,
      createdByUserId: user.id,
      note: `Transfert ${fromWarehouseId} -> ${toWarehouseId}`
    };
    mockStockMovements = [inMovement, outMovement, ...mockStockMovements];

    return of(jsonResponse({ ok: true })).pipe(delay(getDelayMs()));
  }

  // Categories
  if (url.endsWith('/api/categories') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    return of(jsonResponse({ items: mockCategories, total: mockCategories.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/products') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
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
      stockQuantity: 0,
      alertThreshold: Number(input.alertThreshold ?? 0)
    };

    const warehouseId = warehouseIdFromReq(req);
    for (const wh of mockWarehouses) {
      setStock(wh.id, created.id, 0);
    }

    const initialQty = Number(input.stockQuantity ?? 0);
    if (Number.isFinite(initialQty) && initialQty >= 0) {
      setStock(warehouseId, created.id, initialQty);
    }

    mockProducts = [created, ...mockProducts];
    return of(jsonResponse({ ...created, stockQuantity: getStock(warehouseId, created.id) }, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/products\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    const patch = req.body as Partial<Product>;
    const idx = mockProducts.findIndex((p) => p.id === id);

    if (idx === -1) return httpError(404, 'Produit introuvable.').pipe(delay(getDelayMs()));

    const before = { ...mockProducts[idx] };

    const warehouseId = warehouseIdFromReq(req);

    if (patch.stockQuantity !== undefined) {
      const q = Number(patch.stockQuantity);
      if (Number.isFinite(q) && q >= 0) setStock(warehouseId, id, q);
    }

    const { stockQuantity: _ignored, ...rest } = patch;
    const updated: Product = { ...mockProducts[idx], ...rest, id };
    mockProducts = mockProducts.map((p) => (p.id === id ? updated : p));

    appendAudit({
      userId: user.id,
      username: user.username,
      action: 'UPDATE',
      entityType: 'PRODUCT',
      entityId: id,
      before,
      after: { ...updated, stockQuantity: getStock(warehouseId, id) },
      meta: { warehouseId }
    });

    return of(jsonResponse({ ...updated, stockQuantity: getStock(warehouseId, id) })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/products\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    mockProducts = mockProducts.filter((p) => p.id !== id);
    for (const wh of Object.keys(mockWarehouseStocks)) {
      delete mockWarehouseStocks[wh]?.[id];
    }
    return of(jsonResponse({ ok: true })).pipe(delay(getDelayMs()));
  }

  // Inventory
  if (url.endsWith('/api/inventory/sessions') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const items = [...mockInventorySessions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/inventory\/sessions\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const id = url.split('/').pop() as string;
    const s = mockInventorySessions.find((x) => x.id === id);
    if (!s) return httpError(404, 'Inventaire introuvable.').pipe(delay(getDelayMs()));
    return of(jsonResponse(s)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/inventory/sessions') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const body = (req.body ?? {}) as { note?: string; lines?: { productId?: string; physicalQuantity?: number }[] };
    const linesInput = Array.isArray(body.lines) ? body.lines : [];
    if (linesInput.length === 0) return httpError(400, 'Lignes requises.').pipe(delay(getDelayMs()));

    const lines: InventorySession['lines'] = [];

    const warehouseId = warehouseIdFromReq(req);

    for (const l of linesInput) {
      const productId = String(l.productId ?? '').trim();
      const physicalQuantity = Number(l.physicalQuantity ?? Number.NaN);
      if (!productId) return httpError(400, 'Produit requis.').pipe(delay(getDelayMs()));
      if (!Number.isFinite(physicalQuantity) || physicalQuantity < 0) {
        return httpError(400, 'Quantité physique invalide.').pipe(delay(getDelayMs()));
      }

      const p = mockProducts.find((x) => x.id === productId);
      if (!p) return httpError(404, 'Produit introuvable.').pipe(delay(getDelayMs()));

      const systemQuantity = getStock(warehouseId, productId);
      const difference = physicalQuantity - systemQuantity;

      lines.push({
        productId,
        productSku: p.sku,
        productName: p.name,
        systemQuantity,
        physicalQuantity,
        difference
      });
    }

    // Apply adjustments + create stock movements
    for (const ln of lines) {
      if (ln.difference === 0) continue;

      setStock(warehouseId, ln.productId, ln.physicalQuantity);

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
        productId: ln.productId,
        quantity: ln.difference,
        reason: 'ADJUSTMENT',
        createdAt: new Date().toISOString(),
        createdByUserId: user.id,
        note: `Inventaire (${warehouseId})`
      };
      mockStockMovements = [movement, ...mockStockMovements];
    }

    const itemsCount = lines.length;
    const totalDifference = lines.reduce((acc, l) => acc + l.difference, 0);

    const created: InventorySession = {
      id: `inv_${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
      note: body.note ? String(body.note).trim() : undefined,
      lines,
      itemsCount,
      totalDifference
    };

    mockInventorySessions = [created, ...mockInventorySessions];
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  // Suppliers
  if (url.endsWith('/api/suppliers') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    return of(jsonResponse({ items: mockSuppliers, total: mockSuppliers.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/suppliers') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const input = req.body as Partial<Supplier>;
    const name = String(input.name ?? '').trim();
    const deliveryLeadTimeDays = Number(input.deliveryLeadTimeDays ?? 0);

    if (!name) return httpError(400, 'Nom requis.').pipe(delay(getDelayMs()));
    if (!Number.isFinite(deliveryLeadTimeDays) || deliveryLeadTimeDays < 0) {
      return httpError(400, 'Délai de livraison invalide.').pipe(delay(getDelayMs()));
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
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/suppliers\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const id = url.split('/').pop() as string;
    const s = mockSuppliers.find((x) => x.id === id);
    if (!s) return httpError(404, 'Fournisseur introuvable.').pipe(delay(getDelayMs()));
    return of(jsonResponse(s)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/suppliers\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    const patch = req.body as Partial<Supplier>;
    const idx = mockSuppliers.findIndex((x) => x.id === id);
    if (idx === -1) return httpError(404, 'Fournisseur introuvable.').pipe(delay(getDelayMs()));

    const name = patch.name ? String(patch.name).trim() : mockSuppliers[idx].name;
    const deliveryLeadTimeDays = Number(patch.deliveryLeadTimeDays ?? mockSuppliers[idx].deliveryLeadTimeDays);

    if (!name) return httpError(400, 'Nom requis.').pipe(delay(getDelayMs()));
    if (!Number.isFinite(deliveryLeadTimeDays) || deliveryLeadTimeDays < 0) {
      return httpError(400, 'Délai de livraison invalide.').pipe(delay(getDelayMs()));
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
    return of(jsonResponse(updated)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/suppliers\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    mockSuppliers = mockSuppliers.filter((x) => x.id !== id);
    mockSupplierPurchases = mockSupplierPurchases.filter((p) => p.supplierId !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/suppliers\/[^/]+\/purchases$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const supplierId = url.split('/').slice(-2)[0] as string;
    const items = mockSupplierPurchases
      .filter((p) => p.supplierId === supplierId)
      .sort((a, b) => (a.purchaseDateIso < b.purchaseDateIso ? 1 : -1));

    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  // Cash register
  if (url.endsWith('/api/cash-register/current') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const current = mockCashSessions.find((s) => s.status === 'OPEN') ?? null;
    return of(jsonResponse(current ? computeCashSessionSummary(current) : null)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/cash-register/sessions') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const items = [...mockCashSessions]
      .map((s) => computeCashSessionSummary(s))
      .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/cash-register/open') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE', 'CAISSIER'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const current = mockCashSessions.find((s) => s.status === 'OPEN');
    if (current) return httpError(400, 'Caisse déjà ouverte.').pipe(delay(getDelayMs()));

    const body = (req.body ?? {}) as { openingBalance?: number };
    const openingBalance = Number(body.openingBalance ?? 0);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return httpError(400, 'Fond de caisse invalide.').pipe(delay(getDelayMs()));
    }

    const created: CashRegisterSession = computeCashSessionSummary({
      id: `cr_${Date.now()}`,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      openedByUserId: user.id,
      openingBalance,
      cashSalesTotal: 0,
      totalIn: 0,
      totalOut: 0,
      expectedCash: openingBalance,
      difference: 0
    });

    mockCashSessions = [created, ...mockCashSessions];
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/cash-register/operations') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE', 'CAISSIER'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const current = mockCashSessions.find((s) => s.status === 'OPEN');
    if (!current) return httpError(400, 'Aucune caisse ouverte.').pipe(delay(getDelayMs()));

    const body = (req.body ?? {}) as { type?: string; amount?: number; note?: string };
    const type = body.type === 'OUT' ? 'OUT' : body.type === 'IN' ? 'IN' : null;
    const amount = Number(body.amount ?? 0);
    const note = body.note ? String(body.note).trim() : undefined;

    if (!type) return httpError(400, 'Type opération invalide.').pipe(delay(getDelayMs()));
    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(getDelayMs()));

    const op: CashOperation = {
      id: `cro_${Date.now()}`,
      sessionId: current.id,
      type,
      amount,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
      note
    };

    mockCashOperations = [op, ...mockCashOperations];
    return of(jsonResponse(op, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/cash-register\/sessions\/[^/]+\/operations$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const sessionId = url.split('/').slice(-2)[0] as string;
    const items = mockCashOperations
      .filter((o) => o.sessionId === sessionId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/cash-register/close') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE', 'CAISSIER'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const current = mockCashSessions.find((s) => s.status === 'OPEN');
    if (!current) return httpError(400, 'Aucune caisse ouverte.').pipe(delay(getDelayMs()));

    const body = (req.body ?? {}) as { countedCash?: number };
    const countedCash = Number(body.countedCash ?? 0);
    if (!Number.isFinite(countedCash) || countedCash < 0) {
      return httpError(400, 'Montant compté invalide.').pipe(delay(getDelayMs()));
    }

    const closedBase: CashRegisterSession = {
      ...current,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closedByUserId: user.id,
      countedCash
    };

    const closed = computeCashSessionSummary(closedBase);
    mockCashSessions = mockCashSessions.map((s) => (s.id === current.id ? closed : s));
    return of(jsonResponse(closed)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/suppliers\/[^/]+\/payments$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const supplierId = url.split('/').slice(-2)[0] as string;
    const items = mockSupplierPayments
      .filter((p) => p.supplierId === supplierId)
      .sort((a, b) => (a.paymentDateIso < b.paymentDateIso ? 1 : -1));

    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/suppliers\/[^/]+\/payments$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const supplierId = url.split('/').slice(-2)[0] as string;
    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    if (!supplier) return httpError(404, 'Fournisseur introuvable.').pipe(delay(getDelayMs()));

    const body = (req.body ?? {}) as { amount?: number; paymentDateIso?: string; orderId?: string; note?: string };
    const amount = Number(body.amount ?? 0);
    const paymentDateIso = String(body.paymentDateIso ?? '').trim();
    const orderId = body.orderId ? String(body.orderId).trim() : undefined;

    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(getDelayMs()));
    if (!paymentDateIso) return httpError(400, 'Date paiement requise.').pipe(delay(getDelayMs()));

    if (orderId) {
      const idx = mockPurchaseOrders.findIndex((o) => o.id === orderId && o.supplierId === supplierId);
      if (idx === -1) return httpError(400, 'Commande invalide.').pipe(delay(getDelayMs()));
      const order = mockPurchaseOrders[idx];
      const remaining = Math.max(0, order.totalAmount - (order.paidAmount ?? 0));
      if (amount > remaining) return httpError(400, 'Montant supérieur au reste à payer.').pipe(delay(getDelayMs()));

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
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  // Purchases (orders)
  if (url.endsWith('/api/purchases/orders') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const items = [...mockPurchaseOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/purchases/orders') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const body = (req.body ?? {}) as {
      supplierId?: string;
      lines?: Array<{ productId?: string; quantity?: number; unitPurchasePrice?: number }>;
    };

    const supplierId = String(body.supplierId ?? '').trim();
    if (!supplierId) return httpError(400, 'Fournisseur requis.').pipe(delay(getDelayMs()));

    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    if (!supplier) return httpError(400, 'Fournisseur invalide.').pipe(delay(getDelayMs()));

    const linesInput = Array.isArray(body.lines) ? body.lines : [];
    if (linesInput.length === 0) return httpError(400, 'Lignes requises.').pipe(delay(getDelayMs()));

    const lines: PurchaseOrder['lines'] = [];

    for (const l of linesInput) {
      const productId = String(l.productId ?? '').trim();
      const qty = Number(l.quantity ?? 0);
      const price = Number(l.unitPurchasePrice ?? 0);
      const product = mockProducts.find((p) => p.id === productId);

      if (!product) return httpError(400, 'Produit invalide.').pipe(delay(getDelayMs()));
      if (!Number.isFinite(qty) || qty <= 0) return httpError(400, 'Quantité invalide.').pipe(delay(getDelayMs()));
      if (!Number.isFinite(price) || price < 0) return httpError(400, "Prix d'achat invalide.").pipe(delay(getDelayMs()));

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
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const id = url.split('/').pop() as string;
    const order = mockPurchaseOrders.find((o) => o.id === id);
    if (!order) return httpError(404, 'Commande introuvable.').pipe(delay(getDelayMs()));

    return of(jsonResponse(order)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+\/receive$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').slice(-2)[0] as string;
    const idx = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (idx === -1) return httpError(404, 'Commande introuvable.').pipe(delay(getDelayMs()));

    const order = mockPurchaseOrders[idx];
    if (order.status !== 'PENDING') return httpError(400, 'Commande déjà livrée.').pipe(delay(getDelayMs()));

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

    return of(jsonResponse(delivered)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+\/invoice$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').slice(-2)[0] as string;
    const idx = mockPurchaseOrders.findIndex((o) => o.id === id);
    if (idx === -1) return httpError(404, 'Commande introuvable.').pipe(delay(getDelayMs()));

    const order = mockPurchaseOrders[idx];
    const body = (req.body ?? {}) as { invoiceNumber?: string; invoiceDateIso?: string };

    const invoiceNumber = String(body.invoiceNumber ?? '').trim();
    const invoiceDateIso = String(body.invoiceDateIso ?? '').trim();
    if (!invoiceNumber) return httpError(400, 'Numéro facture requis.').pipe(delay(getDelayMs()));
    if (!invoiceDateIso) return httpError(400, 'Date facture requise.').pipe(delay(getDelayMs()));

    const invoice: SupplierInvoice = {
      invoiceNumber,
      invoiceDateIso,
      totalAmount: order.totalAmount
    };

    const updated: PurchaseOrder = { ...order, invoice };
    mockPurchaseOrders = mockPurchaseOrders.map((o) => (o.id === id ? updated : o));
    return of(jsonResponse(invoice, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/purchases\/orders\/[^/]+\/pay$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const orderId = url.split('/').slice(-2)[0] as string;
    const idx = mockPurchaseOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) return httpError(404, 'Commande introuvable.').pipe(delay(getDelayMs()));

    const order = mockPurchaseOrders[idx];
    const body = (req.body ?? {}) as { amount?: number; paymentDateIso?: string; note?: string };

    const amount = Number(body.amount ?? 0);
    const paymentDateIso = String(body.paymentDateIso ?? '').trim();
    const note = body.note ? String(body.note).trim() : undefined;

    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(getDelayMs()));
    if (!paymentDateIso) return httpError(400, 'Date paiement requise.').pipe(delay(getDelayMs()));

    const remaining = Math.max(0, order.totalAmount - (order.paidAmount ?? 0));
    if (amount > remaining) return httpError(400, 'Montant supérieur au reste à payer.').pipe(delay(getDelayMs()));

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
    return of(jsonResponse(updated)).pipe(delay(getDelayMs()));
  }

  // Users (lecture simple)
  if (url.endsWith('/api/users') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    return of(jsonResponse({ items: mockUsers, total: mockUsers.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/users') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const input = req.body as Partial<User>;
    const username = String(input.username ?? '').trim();
    const fullName = String(input.fullName ?? '').trim();
    const roles = (input.roles ?? []) as Role[];

    if (!username) return httpError(400, 'Username requis.').pipe(delay(getDelayMs()));
    if (!fullName) return httpError(400, 'Nom complet requis.').pipe(delay(getDelayMs()));
    if (!Array.isArray(roles) || roles.length === 0) return httpError(400, 'Rôle requis.').pipe(delay(getDelayMs()));
    if (mockUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return httpError(400, 'Username déjà utilisé.').pipe(delay(getDelayMs()));
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
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/users\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    const patch = req.body as Partial<User>;
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return httpError(404, 'Utilisateur introuvable.').pipe(delay(getDelayMs()));

    const username = patch.username ? String(patch.username).trim() : mockUsers[idx].username;
    const fullName = patch.fullName ? String(patch.fullName).trim() : mockUsers[idx].fullName;
    const roles = (patch.roles ?? mockUsers[idx].roles) as Role[];

    if (!username) return httpError(400, 'Username requis.').pipe(delay(getDelayMs()));
    if (!fullName) return httpError(400, 'Nom complet requis.').pipe(delay(getDelayMs()));
    if (!Array.isArray(roles) || roles.length === 0) return httpError(400, 'Rôle requis.').pipe(delay(getDelayMs()));

    if (mockUsers.some((u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
      return httpError(400, 'Username déjà utilisé.').pipe(delay(getDelayMs()));
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
    return of(jsonResponse(updated)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/users\/[^/]+\/active$/) && req.method === 'PATCH') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').slice(-2)[0] as string;
    const body = (req.body ?? {}) as { isActive?: boolean };
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return httpError(404, 'Utilisateur introuvable.').pipe(delay(getDelayMs()));

    const updated: User = { ...mockUsers[idx], isActive: Boolean(body.isActive) };
    (mockUsers as User[]) = mockUsers.map((u) => (u.id === id ? updated : u));
    return of(jsonResponse(updated)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/users\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    (mockUsers as User[]) = mockUsers.filter((u) => u.id !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(getDelayMs()));
  }

  // Customers
  if (url.endsWith('/api/customers') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    return of(jsonResponse({ items: mockCustomers, total: mockCustomers.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/customers') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const input = req.body as Partial<Customer>;
    const name = String(input.name ?? '').trim();
    if (!name) return httpError(400, 'Nom client requis.').pipe(delay(getDelayMs()));

    const created: Customer = {
      id: `c_${Date.now()}`,
      name,
      phone: input.phone ? String(input.phone) : undefined,
      email: input.email ? String(input.email) : undefined,
      creditLimit: Number.isFinite(Number(input.creditLimit)) ? Number(input.creditLimit) : 0
    };

    mockCustomers = [created, ...mockCustomers];
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/customers\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const id = url.split('/').pop() as string;
    const c = mockCustomers.find((x) => x.id === id);
    if (!c) return httpError(404, 'Client introuvable.').pipe(delay(getDelayMs()));
    return of(jsonResponse(c)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/customers\/[^/]+$/) && req.method === 'PATCH') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE', 'CAISSIER'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    const idx = mockCustomers.findIndex((x) => x.id === id);
    if (idx === -1) return httpError(404, 'Client introuvable.').pipe(delay(getDelayMs()));

    const patch = (req.body ?? {}) as Partial<Customer>;
    const name = patch.name !== undefined ? String(patch.name).trim() : mockCustomers[idx].name;
    if (!name) return httpError(400, 'Nom client requis.').pipe(delay(getDelayMs()));

    const creditLimitRaw = patch.creditLimit !== undefined ? Number(patch.creditLimit) : mockCustomers[idx].creditLimit;
    const creditLimit = Number.isFinite(creditLimitRaw) && creditLimitRaw >= 0 ? creditLimitRaw : 0;

    const updated: Customer = {
      ...mockCustomers[idx],
      ...patch,
      id,
      name,
      phone: patch.phone ? String(patch.phone) : patch.phone === '' ? undefined : mockCustomers[idx].phone,
      email: patch.email ? String(patch.email) : patch.email === '' ? undefined : mockCustomers[idx].email,
      creditLimit
    };

    mockCustomers = mockCustomers.map((c) => (c.id === id ? updated : c));
    return of(jsonResponse(updated)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/customers\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    mockCustomers = mockCustomers.filter((c) => c.id !== id);
    mockCustomerPayments = mockCustomerPayments.filter((p) => p.customerId !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/customers\/[^/]+\/sales$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const customerId = url.split('/').slice(-2)[0] as string;
    const items = mockSales
      .filter((s) => s.customerId === customerId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/customers\/[^/]+\/payments$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const customerId = url.split('/').slice(-2)[0] as string;
    const items = mockCustomerPayments
      .filter((p) => p.customerId === customerId)
      .sort((a, b) => (a.paymentDateIso < b.paymentDateIso ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/customers\/[^/]+\/payments$/) && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE', 'CAISSIER'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const customerId = url.split('/').slice(-2)[0] as string;
    const customer = mockCustomers.find((c) => c.id === customerId);
    if (!customer) return httpError(404, 'Client introuvable.').pipe(delay(getDelayMs()));

    const body = (req.body ?? {}) as { amount?: number; paymentDateIso?: string; note?: string };
    const amount = Number(body.amount ?? 0);
    const paymentDateIso = String(body.paymentDateIso ?? '').trim();
    const note = body.note ? String(body.note).trim() : undefined;

    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(getDelayMs()));
    if (!paymentDateIso) return httpError(400, 'Date paiement requise.').pipe(delay(getDelayMs()));

    const created: CustomerPayment = {
      id: `cp_${Date.now()}`,
      customerId,
      paymentDateIso,
      amount,
      note
    };

    mockCustomerPayments = [created, ...mockCustomerPayments];
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  // Stock movements
  if (url.endsWith('/api/stock/movements') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

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

    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/stock/movements') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const input = req.body as Partial<StockMovement>;
    const productId = String(input.productId ?? '');
    const quantity = Number(input.quantity ?? 0);
    const reason = (input.reason ?? 'ADJUSTMENT') as StockMovement['reason'];

    if (!productId) return httpError(400, 'Produit requis.').pipe(delay(getDelayMs()));
    if (!Number.isFinite(quantity) || quantity === 0) {
      return httpError(400, 'Quantité invalide.').pipe(delay(getDelayMs()));
    }

    const product = mockProducts.find((p) => p.id === productId);
    if (!product) return httpError(404, 'Produit introuvable.').pipe(delay(getDelayMs()));

    const warehouseId = warehouseIdFromReq(req);
    const updatedQty = getStock(warehouseId, productId) + quantity;
    if (updatedQty < 0) return httpError(400, 'Stock insuffisant.').pipe(delay(getDelayMs()));

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
    setStock(warehouseId, productId, updatedQty);

    // Add history
    mockStockMovements = [movement, ...mockStockMovements];

    return of(jsonResponse(movement, 201)).pipe(delay(getDelayMs()));
  }

  // Sales
  if (url.endsWith('/api/sales') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    return of(jsonResponse({ items: mockSales, total: mockSales.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/sales') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const input = req.body as Partial<Sale>;

    const items = (input.items ?? []).map((it) => ({
      productId: String(it.productId ?? ''),
      quantity: Number(it.quantity ?? 0),
      unitPrice: Number(it.unitPrice ?? 0),
      purchasePrice: Number(it.purchasePrice ?? 0)
    }));

    if (items.length === 0) return httpError(400, 'Panier vide.').pipe(delay(getDelayMs()));
    if (items.some((it) => !it.productId || !Number.isFinite(it.quantity) || it.quantity <= 0)) {
      return httpError(400, 'Articles invalides.').pipe(delay(getDelayMs()));
    }

    const total = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    const profit = items.reduce((acc, it) => acc + (it.unitPrice - it.purchasePrice) * it.quantity, 0);

    const customerId = input.customerId ? String(input.customerId) : undefined;
    const paidAmount = Number(input.paidAmount ?? total);
    if (!Number.isFinite(paidAmount) || paidAmount < 0) return httpError(400, 'Montant payé invalide.').pipe(delay(getDelayMs()));
    if (paidAmount > total) return httpError(400, 'Montant payé supérieur au total.').pipe(delay(getDelayMs()));

    if (customerId) {
      const customer = mockCustomers.find((c) => c.id === customerId);
      if (!customer) return httpError(400, 'Client invalide.').pipe(delay(getDelayMs()));

      const totalSales = mockSales.filter((s) => s.customerId === customerId).reduce((a, s) => a + s.total, 0);
      const totalPaidSales = mockSales.filter((s) => s.customerId === customerId).reduce((a, s) => a + (s.paidAmount ?? s.total), 0);
      const totalPayments = mockCustomerPayments.filter((p) => p.customerId === customerId).reduce((a, p) => a + p.amount, 0);

      const currentDebt = totalSales - totalPaidSales - totalPayments;
      const nextDebt = currentDebt + (total - paidAmount);

      if (nextDebt > (customer.creditLimit ?? 0)) {
        return httpError(400, 'Limite de crédit dépassée.').pipe(delay(getDelayMs()));
      }
    }

    const warehouseId = warehouseIdFromReq(req);

    // Stock validation
    for (const it of items) {
      const p = mockProducts.find((x) => x.id === it.productId);
      if (!p) return httpError(404, 'Produit introuvable.').pipe(delay(getDelayMs()));
      if (getStock(warehouseId, it.productId) - it.quantity < 0) {
        return httpError(400, 'Stock insuffisant.').pipe(delay(getDelayMs()));
      }
    }

    const created: Sale = {
      id: `s_${Date.now()}`,
      type: (input.type ?? 'RETAIL') as Sale['type'],
      customerId,
      items: items as Sale['items'],
      paymentMethod: (input.paymentMethod ?? 'CASH') as Sale['paymentMethod'],
      paidAmount,
      total,
      profit,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id
    };

    // Apply stock & history
    for (const it of items) {
      const newQty = adjustStock(warehouseId, it.productId, -it.quantity);

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
        productId: it.productId,
        quantity: -it.quantity,
        reason: 'SALE',
        createdAt: created.createdAt,
        createdByUserId: user.id,
        note: `Vente ${created.id} (${warehouseId})`
      };
      mockStockMovements = [movement, ...mockStockMovements];
    }

    mockSales = [created, ...mockSales];

    appendAudit({
      userId: user.id,
      username: user.username,
      action: 'CREATE',
      entityType: 'SALE',
      entityId: created.id,
      before: null,
      after: created,
      meta: { warehouseId }
    });

    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  // Appointments - DELETE
  if (url.match(/\/api\/appointments\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    const id = url.split('/').pop()!;
    mockAppointments = mockAppointments.filter(a => a.id !== id);
    return of(jsonResponse(null, 204)).pipe(delay(getDelayMs()));
  }

  // Appointments - PATCH status
  if (url.match(/\/api\/appointments\/[^/]+\/status$/) && req.method === 'PATCH') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    const id = url.split('/')[4];
    const body = req.body as { status: Appointment['status'] };
    const appointment = mockAppointments.find(a => a.id === id);
    if (appointment) {
      appointment.status = body.status;
      return of(jsonResponse(appointment)).pipe(delay(getDelayMs()));
    }
    return httpError(404, 'Rendez-vous non trouvé.').pipe(delay(getDelayMs()));
  }

  // Appointments - PUT
  if (url.match(/\/api\/appointments\/[^/]+$/) && req.method === 'PUT') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    const id = url.split('/').pop()!;
    const body = req.body as Partial<Appointment>;
    const idx = mockAppointments.findIndex(a => a.id === id);
    if (idx !== -1) {
      mockAppointments[idx] = { ...mockAppointments[idx], ...body };
      return of(jsonResponse(mockAppointments[idx])).pipe(delay(getDelayMs()));
    }
    return httpError(404, 'Rendez-vous non trouvé.').pipe(delay(getDelayMs()));
  }

  // Appointments - GET by ID
  if (url.match(/\/api\/appointments\/[^/]+$/) && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    const id = url.split('/').pop()!;
    const appointment = mockAppointments.find(a => a.id === id);
    if (appointment) {
      return of(jsonResponse(appointment)).pipe(delay(getDelayMs()));
    }
    return httpError(404, 'Rendez-vous non trouvé.').pipe(delay(getDelayMs()));
  }

  // Appointments - POST (create)
  if (url.endsWith('/api/appointments') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    const body = req.body as Omit<Appointment, 'id'>;
    const created: Appointment = {
      id: `a_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...body
    };
    mockAppointments = [created, ...mockAppointments];
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  // Appointments - GET list with filters
  if (url.endsWith('/api/appointments') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    let filtered = [...mockAppointments];
    const params = req.params;
    const search = params.get('search');
    const status = params.get('status');
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');
    const page = parseInt(params.get('page') || '0', 10);
    const size = parseInt(params.get('size') || '25', 10);

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(a => a.customerName.toLowerCase().includes(s));
    }
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    if (dateFrom) {
      filtered = filtered.filter(a => new Date(a.dateTime) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(a => new Date(a.dateTime) <= new Date(dateTo + 'T23:59:59'));
    }

    const total = filtered.length;
    const items = filtered.slice(page * size, (page + 1) * size);

    return of(jsonResponse({ items, total })).pipe(delay(getDelayMs()));
  }

  // Reports
  if (url.endsWith('/api/reports/daily') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const date = String(req.params.get('date') ?? new Date().toISOString().slice(0, 10));

    const expenses = mockExpenses
      .filter((e) => e.expenseDateIso === date)
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);

    const report: DailyReport = {
      date,
      totalSales: mockSales.reduce((a, s) => a + s.total, 0),
      transactionsCount: mockSales.length,
      profit: mockSales.reduce((a, s) => a + s.profit, 0),
      expenses,
      stockAlertsCount: mockProducts.filter((p) => p.stockQuantity <= p.alertThreshold).length
    };

    return of(jsonResponse(report)).pipe(delay(getDelayMs()));
  }

  // Expenses
  if (url.endsWith('/api/expenses') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const items = [...mockExpenses].sort((a, b) => (a.expenseDateIso < b.expenseDateIso ? 1 : -1));
    return of(jsonResponse({ items, total: items.length })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/expenses') && req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN', 'GESTIONNAIRE'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const body = (req.body ?? {}) as Partial<Expense>;
    const category = String(body.category ?? '').trim();
    const label = String(body.label ?? '').trim();
    const amount = Number(body.amount ?? 0);
    const expenseDateIso = String(body.expenseDateIso ?? '').trim();
    const note = body.note ? String(body.note).trim() : undefined;

    if (!category) return httpError(400, 'Catégorie requise.').pipe(delay(getDelayMs()));
    if (!label) return httpError(400, 'Libellé requis.').pipe(delay(getDelayMs()));
    if (!Number.isFinite(amount) || amount <= 0) return httpError(400, 'Montant invalide.').pipe(delay(getDelayMs()));
    if (!expenseDateIso) return httpError(400, 'Date requise.').pipe(delay(getDelayMs()));

    const created: Expense = {
      id: `e_${Date.now()}`,
      category,
      label,
      amount,
      expenseDateIso,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
      note
    };

    mockExpenses = [created, ...mockExpenses];
    return of(jsonResponse(created, 201)).pipe(delay(getDelayMs()));
  }

  if (url.match(/\/api\/expenses\/[^/]+$/) && req.method === 'DELETE') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));
    if (!hasRole(user, ['ADMIN'])) {
      return httpError(403, 'Accès refusé.').pipe(delay(getDelayMs()));
    }

    const id = url.split('/').pop() as string;
    mockExpenses = mockExpenses.filter((e) => e.id !== id);
    return of(jsonResponse({ ok: true })).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/reports/monthly') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const month = String(req.params.get('month') ?? new Date().toISOString().slice(0, 7));

    const expenses = mockExpenses
      .filter((e) => e.expenseDateIso.slice(0, 7) === month)
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);

    const profit = mockSales.reduce((a, s) => a + s.profit, 0);

    const report: MonthlyReport = {
      month,
      totalSales: mockSales.reduce((a, s) => a + s.total, 0),
      profitNet: profit - expenses,
      expenses,
      lossCount: 0
    };

    return of(jsonResponse(report)).pipe(delay(getDelayMs()));
  }

  if (url.endsWith('/api/reports/yearly') && req.method === 'GET') {
    const user = requireAuth(req);
    if (!user) return httpError(401, 'Non authentifié.').pipe(delay(getDelayMs()));

    const year = Number(req.params.get('year') ?? new Date().getFullYear());

    const expenses = mockExpenses
      .filter((e) => Number(e.expenseDateIso.slice(0, 4)) === year)
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);

    const profit = mockSales.reduce((a, s) => a + s.profit, 0);

    const report: YearlyReport = {
      year,
      totalSales: mockSales.reduce((a, s) => a + s.total, 0),
      profitNet: profit - expenses,
      expenses
    };

    return of(jsonResponse(report)).pipe(delay(getDelayMs()));
  }

  // Sinon, on laisse passer (utile si tu mixes mocks + vraie API plus tard)
  return next(req);
};
