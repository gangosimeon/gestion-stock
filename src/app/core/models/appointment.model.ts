// Contrat /api/appointments : agenda du dépôt courant, règles tenues par le backend.

/** SCHEDULED : planifié (seul statut modifiable) ; les autres sont finaux. */
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export interface Appointment {
  id: string;
  warehouseId: string;
  /** Client du fichier, ou null pour un prospect. */
  customerId: string | null;
  customerName: string;
  phone: string;
  /** Date et heure locales du dépôt (AAAA-MM-JJTHH:mm:ss). */
  dateTime: string;
  /** Même instant, en UTC. */
  scheduledAt: string;
  status: AppointmentStatus;
  note?: string | null;
  cancellationReason?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
  createdAt: string;
  createdByUserId: string | null;
  updatedAt: string;
}

/** Prise ou modification (remplacement complet) d'un rendez-vous planifié. */
export interface AppointmentRequest {
  /** Client du fichier : nom repris de sa fiche, téléphone aussi si `phone` est vide. */
  customerId?: string;
  /** Prospect : nom et téléphone obligatoires. */
  customerName?: string;
  phone?: string;
  /** Heure locale du dépôt, AAAA-MM-JJTHH:mm (valeur d'un champ datetime-local). */
  dateTime: string;
  note?: string;
}

export interface AppointmentFilter {
  search?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Planifié',
  COMPLETED: 'Honoré',
  NO_SHOW: 'Absent',
  CANCELLED: 'Annulé'
};
