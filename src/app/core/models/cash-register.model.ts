export type CashRegisterSessionStatus = 'OPEN' | 'CLOSED';
export type CashOperationType = 'IN' | 'OUT';

export interface CashOperation {
  id: string;
  sessionId: string;
  type: CashOperationType;
  amount: number;
  createdAt: string;
  createdByUserId: string;
  note?: string;
}

export interface CashRegisterSession {
  id: string;
  status: CashRegisterSessionStatus;

  openedAt: string;
  openedByUserId: string;
  openingBalance: number;

  closedAt?: string;
  closedByUserId?: string;
  countedCash?: number;

  // Computed summary (server-side)
  cashSalesTotal: number;
  totalIn: number;
  totalOut: number;
  expectedCash: number;
  difference: number;
}
