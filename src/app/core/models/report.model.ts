export interface DailyReport {
  date: string;
  totalSales: number;
  transactionsCount: number;
  profit: number;
  expenses: number;
  stockAlertsCount: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  totalSales: number;
  profitNet: number;
  expenses: number;
  lossCount: number;
}

export interface YearlyReport {
  year: number;
  totalSales: number;
  profitNet: number;
  expenses: number;
}
