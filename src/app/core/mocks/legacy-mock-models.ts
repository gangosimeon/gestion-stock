/**
 * Ancien contrat simulé des dépenses et rendez-vous, conservé tant que leurs routes mock existent
 * (suppression après validation de la migration vers Spring Boot, voir docs/migration-api.md).
 * Le front utilise désormais core/models/expense.model.ts et appointment.model.ts.
 */
export interface Expense {
  id: string;
  category: string;
  label: string;
  amount: number;
  expenseDateIso: string;
  createdAt: string;
  createdByUserId: string;
  note?: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  phone: string;
  dateTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  note?: string;
}
