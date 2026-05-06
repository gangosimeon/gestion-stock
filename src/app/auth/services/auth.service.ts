import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { AuthResponse } from '../models/auth-response.model';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';
const EXPIRY_KEY = 'token_expiry';
const REMEMBER_KEY = 'remember_me';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(this.loadUserFromStorage());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  // ─── Stockage ────────────────────────────────────────────────────

  private get storage(): Storage {
    return localStorage.getItem(REMEMBER_KEY) === '1' ? localStorage : sessionStorage;
  }

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
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    const store = remember ? localStorage : sessionStorage;
    store.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    store.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    store.setItem(USER_KEY, JSON.stringify(res.user));
    store.setItem(EXPIRY_KEY, String(Date.now() + res.expiresIn * 1000));
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

  // ─── API publique ─────────────────────────────────────────────────

  isAuthenticated(): boolean {
    if (!this.accessToken) return false;
    const expiry = parseInt(
      localStorage.getItem(EXPIRY_KEY) ??
        sessionStorage.getItem(EXPIRY_KEY) ??
        '0',
      10
    );
    return expiry === 0 || Date.now() < expiry;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  }

  login(username: string, password: string, remember = false): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          this.saveSession(res, remember);
          this.currentUserSubject.next(res.user);
        })
      );
  }

  logout(): void {
    this.clearSession();
    this.currentUserSubject.next(null);
    void this.router.navigateByUrl('/login');
  }

  refreshToken(): Observable<AuthResponse> {
    const token = this.refreshTokenValue;
    if (!token) return throwError(() => new Error('Aucun refresh token disponible'));

    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken: token })
      .pipe(
        tap((res) => {
          const remember = localStorage.getItem(REMEMBER_KEY) === '1';
          this.saveSession(res, remember);
          this.currentUserSubject.next(res.user);
        }),
        catchError((err) => {
          this.logout();
          return throwError(() => err);
        })
      );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/auth/forgot-password`,
      { email }
    );
  }
}
