import { User } from './user.model';

/** Réponse de POST /api/auth/login et /api/auth/refresh. */
export interface AuthResponse {
  accessToken: string;
  /** À usage unique : chaque renouvellement le remplace. */
  refreshToken: string;
  /** Durée de validité du jeton d'accès, en secondes. */
  expiresIn: number;
  tokenType?: string;
  user: User;
}
