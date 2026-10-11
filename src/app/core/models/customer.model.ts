export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  creditLimit: number;
  // Champs du backend (absents des clients simulés).
  code?: string;
  type?: 'INDIVIDUAL' | 'COMPANY';
  address?: string | null;
  city?: string | null;
  active?: boolean;
  /** Dette du client, calculée par le backend (ventes à crédit − règlements − avoirs). */
  balance?: number;
  /** Crédit encore disponible : plafond − dette (backend). */
  availableCredit?: number;
}
