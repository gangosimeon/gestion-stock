export interface Expense {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
  createdByUserId: string;
  note?: string;
}
