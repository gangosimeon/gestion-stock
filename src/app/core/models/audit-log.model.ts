// Contrat GET /api/audit-logs (journal tenu par le backend, en lecture seule).

// Actions tracées par le backend (liste ouverte : une action nouvelle s'affiche telle quelle).
export type AuditAction = string;

// Types d'objets tracés (liste ouverte, voir AuditModule côté backend).
export type AuditEntityType = string;

// Domaine fonctionnel d'une entrée (filtre « modules »).
export type AuditModule =
  | 'AUTH'
  | 'USER'
  | 'SECURITY'
  | 'CATALOG'
  | 'WAREHOUSE'
  | 'STOCK'
  | 'SUPPLIER'
  | 'PURCHASE'
  | 'CUSTOMER'
  | 'SALE'
  | 'RETURN'
  | 'INVENTORY'
  | 'CASH'
  | 'EXPENSE'
  | 'APPOINTMENT'
  | 'ALERT'
  | 'AUDIT'
  | 'SYSTEM';

// Statut d'une action
export type AuditStatus = 'SUCCESS' | 'FAILURE';

// Diff d'un champ modifié : valeurs JSON quelconques (texte, nombre, objet, liste…)
export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Entrée complète du journal d'audit
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  /** Nul pour une connexion refusée. */
  userId: string | null;
  username: string | null;
  userRole: string | null;
  action: AuditAction;
  module: AuditModule;
  entityType: AuditEntityType;
  entityId: string | null;
  entityLabel: string | null;
  ipAddress: string | null;
  userAgent?: string | null;
  status: AuditStatus;
  changes?: AuditChange[] | null;
  details?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown> | null;
  warehouseId?: string | null;
  traceId?: string | null;
}

// Filtres pour la recherche (dates AAAA-MM-JJ, journées incluses)
export interface AuditLogFilter {
  dateFrom?: string;
  dateTo?: string;
  actions?: AuditAction[];
  entityTypes?: AuditEntityType[];
  modules?: AuditModule[];
  userId?: string;
  status?: AuditStatus;
  search?: string;
  /** Dépôt des entrées (doit être un de vos dépôts ; sinon refus du backend). */
  warehouseId?: string;
}

/** Tri serveur : createdAt | action | module | username | status. */
export interface AuditLogSort {
  field: 'createdAt' | 'action' | 'module' | 'username' | 'status';
  direction: 'asc' | 'desc';
}

// Statistiques du journal
export interface AuditLogStats {
  totalToday: number;
  failuresLast7Days: number;
  /** « - » si aucune activité sur 30 jours. */
  mostActiveUser: string;
  mostFrequentAction: AuditAction | null;
}

export const auditActionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  SET_ACTIVE: 'Activation',
  DEACTIVATE: 'Désactivation',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  PASSWORD_CHANGE: 'Changement de mot de passe',
  PASSWORD_RESET: 'Réinitialisation du mot de passe',
  ASSIGN_ROLES: 'Attribution de rôles',
  EXPORT: 'Export',
  TRANSFER: 'Transfert',
  CORRECTION: 'Correction de stock',
  SET_MAIN: 'Dépôt principal',
  SUBMIT: 'Envoi',
  RECEIVE: 'Réception',
  INVOICE: 'Facture',
  PAY: 'Paiement',
  CANCEL: 'Annulation',
  REVERSAL: 'Contre-passation',
  OPEN: 'Ouverture',
  CLOSE: 'Clôture',
  CASH_OPERATION: 'Opération de caisse',
  START: 'Démarrage',
  ADD_PRODUCTS: 'Ajout de produits',
  REMOVE_PRODUCT: 'Retrait de produit',
  COUNT: 'Comptage',
  VALIDATE: 'Validation',
  REOPEN: 'Réouverture',
  COMPLETE: 'Rendez-vous honoré',
  NO_SHOW: 'Rendez-vous manqué',
  STATUS: 'Clôture de rendez-vous',
  RESET: 'Réinitialisation',
  LOGO_UPLOAD: 'Logo ajouté ou remplacé',
  LOGO_DELETE: 'Logo retiré',
  ISSUE: 'Émission',
  ACCEPT: 'Acceptation',
  REFUSE: 'Refus'
};

export const auditModuleLabels: Record<AuditModule, string> = {
  AUTH: 'Authentification',
  USER: 'Utilisateurs',
  SECURITY: 'Rôles et permissions',
  CATALOG: 'Catalogue',
  WAREHOUSE: 'Dépôts',
  STOCK: 'Stock',
  SUPPLIER: 'Fournisseurs',
  PURCHASE: 'Achats',
  CUSTOMER: 'Clients',
  SALE: 'Ventes',
  RETURN: 'Retours clients',
  INVENTORY: 'Inventaires',
  CASH: 'Caisse',
  EXPENSE: 'Dépenses',
  APPOINTMENT: 'Rendez-vous',
  ALERT: 'Alertes',
  AUDIT: 'Journal d\'audit',
  SYSTEM: 'Système'
};

export const auditEntityTypeLabels: Record<string, string> = {
  USER: 'Utilisateur',
  ROLE: 'Rôle',
  PERMISSION: 'Permission',
  PRODUCT: 'Produit',
  CATEGORY: 'Catégorie',
  BRAND: 'Marque',
  WAREHOUSE: 'Dépôt',
  STOCK_MOVEMENT: 'Mouvement de stock',
  WAREHOUSE_TRANSFER: 'Transfert',
  SUPPLIER: 'Fournisseur',
  PURCHASE_ORDER: 'Commande fournisseur',
  GOODS_RECEIPT: 'Réception',
  SUPPLIER_PAYMENT: 'Paiement fournisseur',
  CUSTOMER: 'Client',
  SALE: 'Vente',
  QUOTE: 'Devis',
  CUSTOMER_RETURN: 'Retour client',
  INVENTORY_SESSION: 'Inventaire',
  CASH_SESSION: 'Session de caisse',
  CASH_ENTRY: 'Opération de caisse',
  EXPENSE: 'Dépense',
  APPOINTMENT: 'Rendez-vous',
  ALERT_SETTING: 'Réglage d\'alerte',
  INVOICE_SETTING: 'Configuration de la facture',
  AUDIT_LOG: 'Journal d\'audit',
  SYSTEM: 'Système'
};

export const auditStatusLabels: Record<AuditStatus, string> = {
  SUCCESS: 'Succès',
  FAILURE: 'Échec'
};

/** Libellé lisible, ou le code brut s'il est inconnu. */
export function auditLabel(labels: Record<string, string>, code: string | null | undefined): string {
  if (!code) return '—';
  return labels[code] ?? code;
}

/** Valeur d'un champ du diff, lisible quel que soit son type JSON. */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'oui' : 'non';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
