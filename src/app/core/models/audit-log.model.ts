// Types d'actions auditées
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'RECEIVE'
  | 'PAY'
  | 'TRANSFER'
  | 'OPEN'
  | 'CLOSE';

// Types d'entités suivies
export type AuditEntityType =
  | 'PRODUCT'
  | 'SALE'
  | 'SUPPLIER'
  | 'PURCHASE_ORDER'
  | 'EXPENSE'
  | 'INVENTORY_SESSION'
  | 'CASH_REGISTER_SESSION'
  | 'WAREHOUSE_TRANSFER'
  | 'CUSTOMER'
  | 'USER'
  | 'SYSTEM';

// Statut d'une action
export type AuditStatus = 'SUCCESS' | 'FAILURE';

// Diff d'un champ modifié
export interface AuditChange {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

// Entrée complète du journal d'audit
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string;
  username: string;
  userRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  ipAddress: string;
  status: AuditStatus;
  changes?: AuditChange[];
  details?: string;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

// Filtres pour la recherche
export interface AuditLogFilter {
  dateFrom?: string;
  dateTo?: string;
  actions?: AuditAction[];
  entityTypes?: AuditEntityType[];
  userId?: string;
  status?: AuditStatus;
  search?: string;
}

// Statistiques du journal
export interface AuditLogStats {
  totalToday: number;
  failuresLast7Days: number;
  mostActiveUser: string;
  mostFrequentAction: AuditAction;
}
