export type AppointmentStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED';

export interface Appointment {
  id: string;
  customerName: string;
  phone?: string;
  dateTime: string;
  status: AppointmentStatus;
  note?: string;
}
