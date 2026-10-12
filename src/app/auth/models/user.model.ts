/** Rôle d'affichage historique (champ `role` du backend : le plus élevé des rôles métier). */
export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

/**
 * Utilisateur connecté, tel que renvoyé par POST /api/auth/login, /api/auth/refresh
 * (champ `user`) et GET /api/auth/me (schéma `Me` du backend).
 */
export interface User {
  id: string;
  username: string;
  email?: string | null;
  fullName?: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Rôles métier (ADMIN, GESTIONNAIRE, CAISSIER…). */
  roles?: string[];
  role: UserRole;
  /**
   * Permissions effectives (`domaine:action`), calculées par le backend. Absentes tant
   * qu'elles n'ont pas été chargées. Elles ne servent qu'à adapter l'interface : chaque
   * endpoint protégé les revérifie côté serveur.
   */
  permissions?: string[];
  mustChangePassword?: boolean;
  defaultWarehouseId?: string | null;
  warehouseIds?: string[];
  magasin?: string;
  avatar?: string;
}
