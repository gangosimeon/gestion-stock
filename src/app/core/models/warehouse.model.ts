export interface Warehouse {
  id: string;
  name: string;
  // Champs du backend (absents des dépôts simulés).
  code?: string;
  type?: string;
  address?: string | null;
  phone?: string | null;
  /** Dépôt principal : repli quand aucun dépôt n'est choisi. */
  main?: boolean;
  active?: boolean;
  /** Horodatage du backend (ISO-8601). */
  createdAt?: string;
  updatedAt?: string;
}
