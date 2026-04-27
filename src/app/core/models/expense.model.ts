export interface Expense {
  id: string;
  category: string;
  label: string;
  amount: number;
  expenseDateIso: string; // YYYY-MM-DD
  createdAt: string;
  createdByUserId: string;
  note?: string;
}
