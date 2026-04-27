export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RECEIVE'
  | 'PAY'
  | 'TRANSFER'
  | 'OPEN'
  | 'CLOSE';

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
  | 'USER';

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string;
  username: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}
