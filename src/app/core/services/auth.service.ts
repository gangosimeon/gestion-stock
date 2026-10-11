import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import { AuthService as NewAuthService } from '../../auth/services/auth.service';
import { User as SessionUser } from '../../auth/models/user.model';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

const ROLES: readonly Role[] = ['ADMIN', 'GESTIONNAIRE', 'CAISSIER'];

function toCoreUser(u: SessionUser): User {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName ?? u.username,
    email: u.email ?? undefined,
    roles: (u.roles ?? []).filter((r): r is Role => ROLES.includes(r as Role)),
    role: u.role,
    isActive: true
  };
}

/**
 * Façade historique utilisée par les features. Toute la session (jetons, utilisateur,
 * permissions) vit dans `auth/services/auth.service.ts` ; ce service la relaie.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly newAuth = inject(NewAuthService);

  readonly user$: Observable<User | null> = this.newAuth.currentUser$.pipe(
    map((u) => (u ? toCoreUser(u) : null))
  );

  get accessToken(): string | null {
    return this.newAuth.accessToken;
  }

  get isAuthenticated(): boolean {
    return this.newAuth.isAuthenticated();
  }

  logout(): void {
    this.newAuth.logout();
  }

  /** @deprecated Préférer `hasPermission$` : les droits viennent des permissions du backend. */
  hasAnyRole(required: readonly string[]): Observable<boolean> {
    return this.user$.pipe(map((u) => !!u && u.roles.some((r) => required.includes(r))));
  }

  /** Permission backend (`domaine:action`) détenue par l'utilisateur courant. Interface seulement. */
  hasPermission$(permission: string): Observable<boolean> {
    return this.newAuth.currentUser$.pipe(map((u) => u?.permissions?.includes(permission) ?? false));
  }

  toHumanError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string') return err.error;
      if (err.error?.message) return String(err.error.message);
      return err.message;
    }

    if (err instanceof Error) return err.message;

    return 'Une erreur est survenue.';
  }

  hydrateUserFromApi(): Observable<User | null> {
    return this.newAuth.ensureCurrentUser().pipe(map((u) => (u ? toCoreUser(u) : null)));
  }
}
