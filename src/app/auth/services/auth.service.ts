import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { AuthResponse } from '../models/auth-response.model';
import { WarehouseContextService } from '../../core/services/warehouse-context.service';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';
const EXPIRY_KEY = 'token_expiry';
const REMEMBER_KEY = 'remember_me';

/**
 * Session utilisateur adossée au backend Spring Boot (/api/auth).
 *
 * - Jeton d'accès JWT (15 min) et refresh token à usage unique, stockés en localStorage
 *   (« se souvenir de moi ») ou en sessionStorage.
 * - Utilisateur courant et permissions effectives : champ `user` de login/refresh (schéma `Me`),
 *   ou GET /api/auth/me s'ils manquent.
 * - Les permissions ne servent qu'à adapter l'interface ; le backend les contrôle sur chaque appel.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly warehouseCtx = inject(WarehouseContextService);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(this.loadUserFromStorage());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  /** Renouvellement en cours, partagé : le refresh token est à usage unique. */
  private refreshInFlight$: Observable<AuthResponse> | null = null;
  private meInFlight$: Observable<User | null> | null = null;

  // ─── Stockage ────────────────────────────────────────────────────

  private loadUserFromStorage(): User | null {
    const json =
      localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    try {
      return json ? (JSON.parse(json) as User) : null;
    } catch {
      return null;
    }
  }

  private saveSession(res: AuthResponse, remember: boolean): void {
    // Aucune trace d'une session précédente dans l'autre stockage : les getters lisent
    // localStorage en premier.
    this.clearSession();
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    const store = remember ? localStorage : sessionStorage;
    store.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    store.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    store.setItem(USER_KEY, JSON.stringify(res.user));
    store.setItem(EXPIRY_KEY, String(Date.now() + res.expiresIn * 1000));
  }

  private saveUser(user: User): void {
    const store = localStorage.getItem(REMEMBER_KEY) === '1' ? localStorage : sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(ACCESS_TOKEN_KEY);
      s.removeItem(REFRESH_TOKEN_KEY);
      s.removeItem(USER_KEY);
      s.removeItem(EXPIRY_KEY);
    });
    localStorage.removeItem(REMEMBER_KEY);
  }

  // ─── Tokens ───────────────────────────────────────────────────────

  get accessToken(): string | null {
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ??
      sessionStorage.getItem(ACCESS_TOKEN_KEY)
    );
  }

  get refreshTokenValue(): string | null {
    return (
      localStorage.getItem(REFRESH_TOKEN_KEY) ??
      sessionStorage.getItem(REFRESH_TOKEN_KEY)
    );
  }

  /** `true` si le jeton d'accès est absent ou a dépassé sa date d'expiration. */
  isAccessTokenExpired(): boolean {
    if (!this.accessToken) return true;
    const expiry = parseInt(
      localStorage.getItem(EXPIRY_KEY) ??
        sessionStorage.getItem(EXPIRY_KEY) ??
        '0',
      10
    );
    return expiry !== 0 && Date.now() >= expiry;
  }

  // ─── API publique ─────────────────────────────────────────────────

  /**
   * Session ouverte : jeton d'accès valide, ou expiré mais renouvelable (refresh token présent).
   * Le backend tranche au premier appel ; un refresh refusé ferme la session.
   */
  isAuthenticated(): boolean {
    if (!this.accessToken) return false;
    return !this.isAccessTokenExpired() || !!this.refreshTokenValue;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  }

  /** Permissions chargées pour l'utilisateur courant (sinon, appeler `ensureCurrentUser()`). */
  permissionsLoaded(): boolean {
    return Array.isArray(this.getCurrentUser()?.permissions);
  }

  /**
   * Indique si l'utilisateur courant détient la permission (code backend `domaine:action`).
   * Sert à adapter l'interface uniquement : le backend reste seul juge.
   */
  hasPermission(permission: string): boolean {
    return this.getCurrentUser()?.permissions?.includes(permission) ?? false;
  }

  /** `true` si l'utilisateur détient au moins une des permissions. */
  hasAnyPermission(permissions: readonly string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  login(username: string, password: string, remember = false): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          // Nouvel utilisateur : le magasin choisi par le précédent n'est peut-être pas autorisé.
          this.warehouseCtx.reset();
          this.saveSession(res, remember);
          this.currentUserSubject.next(res.user);
        }),
        // Le backend renvoie déjà les permissions (schéma Me) ; /auth/me seulement si absentes.
        switchMap((res) =>
          Array.isArray(res.user?.permissions)
            ? of(res)
            : this.loadCurrentUser().pipe(map(() => res))
        )
      );
  }

  /**
   * Utilisateur courant avec ses permissions : celui de la session s'il est complet, sinon
   * GET /api/auth/me. Renvoie `null` sans session ou en cas d'échec.
   */
  ensureCurrentUser(): Observable<User | null> {
    if (!this.isAuthenticated()) return of(null);
    const user = this.getCurrentUser();
    if (user && Array.isArray(user.permissions)) return of(user);
    return this.loadCurrentUser();
  }

  /** Recharge l'utilisateur courant depuis GET /api/auth/me (un seul appel à la fois). */
  loadCurrentUser(): Observable<User | null> {
    if (this.meInFlight$) return this.meInFlight$;
    this.meInFlight$ = this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => this.saveUser(user)),
      catchError(() => of(null)),
      finalize(() => (this.meInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.meInFlight$;
  }

  /**
   * Déconnexion : la session locale est effacée immédiatement (même hors ligne), puis le
   * backend est prié de révoquer le refresh token (POST /api/auth/logout).
   *
   * @returns `true` si le backend a confirmé (204), `false` si la révocation n'a pas pu être
   *          demandée (pas de refresh token, erreur réseau ou serveur)
   */
  logout(): Observable<boolean> {
    const refreshToken = this.refreshTokenValue;
    this.endSession();
    if (!refreshToken) return of(false);

    const revoked$ = this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, { refreshToken })
      .pipe(
        map(() => true),
        catchError(() => {
          console.warn('Déconnexion : révocation du refresh token non confirmée par le serveur.');
          return of(false);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    revoked$.subscribe();
    return revoked$;
  }

  /**
   * Ferme la session locale sans appel serveur (session expirée ou refusée par le backend)
   * et renvoie vers l'écran de connexion.
   */
  endSession(): void {
    this.clearSession();
    this.warehouseCtx.reset();
    this.refreshInFlight$ = null;
    this.meInFlight$ = null;
    this.currentUserSubject.next(null);
    if (!this.router.url.startsWith('/login')) {
      void this.router.navigateByUrl('/login');
    }
  }

  /**
   * Renouvelle la session (POST /api/auth/refresh). Les appels simultanés partagent le même
   * renouvellement : le backend révoque toute la session si un refresh token est réutilisé.
   * Un refus du backend (4xx) ferme la session ; une erreur réseau la laisse ouverte.
   */
  refreshToken(): Observable<AuthResponse> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const token = this.refreshTokenValue;
    if (!token) {
      this.endSession();
      return throwError(() => new Error('Session expirée. Veuillez vous reconnecter.'));
    }

    this.refreshInFlight$ = this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken: token })
      .pipe(
        tap((res) => {
          const remember = localStorage.getItem(REMEMBER_KEY) === '1';
          this.saveSession(res, remember);
          this.currentUserSubject.next(res.user);
        }),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) {
            this.endSession();
          }
          return throwError(() => err);
        }),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    return this.refreshInFlight$;
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/auth/forgot-password`,
      { email }
    );
  }

  /** Message à afficher pour un échec de connexion (codes ApiError du backend). */
  loginErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'Impossible de joindre le serveur.';
      const message = err.error?.message as string | undefined;
      if (message) return message;
      if (err.status === 401) return 'Identifiants incorrects. Veuillez réessayer.';
    }
    return 'Connexion impossible. Veuillez réessayer.';
  }
}
