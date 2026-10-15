import { Role } from './role.model';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  roles: Role[];
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isActive: boolean;
  /** Dépôt utilisé quand aucun n'est choisi dans l'en-tête (toujours parmi les dépôts autorisés). */
  defaultWarehouseId?: string | null;
  /** Dépôts autorisés (hors permission warehouse:all, qui les ouvre tous). */
  warehouseIds?: string[];
  magasin?: string;
  avatar?: string;
}
