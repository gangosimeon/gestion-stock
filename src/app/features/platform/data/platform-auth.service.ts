import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';

/** Super Admin connecté (GET /api/platform/auth/me). */
export interface PlatformAdmin {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mustChangePassword: boolean;
}

interface PlatformAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  admin: PlatformAdmin;
}

const ACCESS_KEY = 'platform_access_token';
const REFRESH_KEY = 'platform_refresh_token';
const ADMIN_KEY = 'platform_admin';
const EXPIRY_KEY = 'platform_token_expiry';

/**
 * Session Super Admin, totalement distincte de celle des entreprises : autres clés de stockage
 * (sessionStorage uniquement : fermée avec l'onglet), autres routes (/api/platform/**), autre jeton.
 * Le rôle Super Admin est contrôlé par le backend ; ce service n'adapte que l'affichage.
 */
@Injectable({ providedIn: 'root' })
export class PlatformAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/platform/auth`;

  private readonly adminSubject = new BehaviorSubject<PlatformAdmin | null>(this.readAdmin());
  readonly admin$ = this.adminSubject.asObservable();

  private refreshInFlight$: Observable<PlatformAuthResponse> | null = null;

  get accessToken(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
  }

  get admin(): PlatformAdmin | null {
    return this.adminSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!sessionStorage.getItem(REFRESH_KEY);
  }

  login(username: string, password: string): Observable<PlatformAdmin> {
    return this.http.post<PlatformAuthResponse>(`${this.base}/login`, { username, password }).pipe(
      tap((res) => this.save(res)),
      map((res) => res.admin)
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<PlatformAdmin> {
    return this.http.post<PlatformAuthResponse>(`${this.base}/change-password`, { currentPassword, newPassword }).pipe(
      tap((res) => this.save(res)),
      map((res) => res.admin)
    );
  }

  /** Renouvellement partagé (refresh token à usage unique) ; un refus ferme la session. */
  refresh(): Observable<PlatformAuthResponse> {
    if (this.refreshInFlight$) return this.refreshInFlight$;
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      this.endSession();
      return throwError(() => new Error('Session expirée'));
    }
    this.refreshInFlight$ = this.http.post<PlatformAuthResponse>(`${this.base}/refresh`, { refreshToken }).pipe(
      tap((res) => this.save(res)),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) this.endSession();
        return throwError(() => err);
      }),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshInFlight$;
  }

  logout(): void {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    this.endSession();
    if (refreshToken) {
      this.http.post<void>(`${this.base}/logout`, { refreshToken }).pipe(catchError(() => of(null))).subscribe();
    }
  }

  endSession(): void {
    [ACCESS_KEY, REFRESH_KEY, ADMIN_KEY, EXPIRY_KEY].forEach((k) => sessionStorage.removeItem(k));
    this.adminSubject.next(null);
    if (!this.router.url.startsWith('/platform/login')) {
      void this.router.navigateByUrl('/platform/login');
    }
  }

  private save(res: PlatformAuthResponse): void {
    sessionStorage.setItem(ACCESS_KEY, res.accessToken);
    sessionStorage.setItem(REFRESH_KEY, res.refreshToken);
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin));
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + res.expiresIn * 1000));
    this.adminSubject.next(res.admin);
  }

  private readAdmin(): PlatformAdmin | null {
    try {
      const json = sessionStorage.getItem(ADMIN_KEY);
      return json ? (JSON.parse(json) as PlatformAdmin) : null;
    } catch {
      return null;
    }
  }
}
