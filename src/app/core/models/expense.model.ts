// Contrat /api/expenses : le backend calcule les totaux et relie les dépenses en espèces à la caisse.

export type ExpenseCategory = 'TRANSPORT' | 'SALARY' | 'RENT' | 'UTILITIES' | 'SUPPLIES' | 'MAINTENANCE' | 'TAXES' | 'OTHER';

/** CASH : sortie de la caisse ouverte de l'auteur ; les autres modes ne touchent pas la caisse. */
export type ExpensePaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE';

/** PAID : comptée ; CANCELLED : visible, hors totaux. */
export type ExpenseStatus = 'PAID' | 'CANCELLED';

export interface Expense {
  id: string;
  /** Référence DEP-AAAA-nnnnnn. */
  number: string;
  warehouseId: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  expenseDateIso: string; // YYYY-MM-DD
  paymentMethod: ExpensePaymentMethod;
  externalReference?: string | null;
  note?: string | null;
  status: ExpenseStatus;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  createdByUserId: string | null;
}

export interface ExpenseFilter {
  dateFrom?: string;
  dateTo?: string;
  category?: ExpenseCategory;
  paymentMethod?: ExpensePaymentMethod;
  status?: ExpenseStatus;
  search?: string;
}

/** Totaux des dépenses payées (GET /api/expenses/summary). */
export interface ExpenseSummary {
  total: number;
  count: number;
  cashTotal: number;
  cancelledCount: number;
  byCategory: { category: ExpenseCategory; count: number; total: number }[];
}

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  TRANSPORT: 'Transport',
  SALARY: 'Salaires',
  RENT: 'Loyer',
  UTILITIES: 'Électricité / Eau / Internet',
  SUPPLIES: 'Fournitures',
  MAINTENANCE: 'Entretien / Réparations',
  TAXES: 'Impôts et taxes',
  OTHER: 'Autre'
};

export const expensePaymentMethodLabels: Record<ExpensePaymentMethod, string> = {
  CASH: 'Espèces (caisse)',
  MOBILE_MONEY: 'Mobile money',
  BANK_TRANSFER: 'Virement',
  CHEQUE: 'Chèque'
};

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  PAID: 'Payée',
  CANCELLED: 'Annulée'
};
