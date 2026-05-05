export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  customerName: string;
  phone: string;
  dateTime: string;
  status: AppointmentStatus;
  note?: string;
}

export interface AppointmentFilter {
  search?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
}
