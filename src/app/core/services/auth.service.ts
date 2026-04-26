import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  get accessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  login(payload: LoginRequest): Observable<User> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap((res) => this.tokenStorage.setAccessToken(res.accessToken)),
        tap((res) => this.userSubject.next(res.user)),
        map((res) => res.user)
      );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.userSubject.next(null);
    void this.router.navigateByUrl('/auth/login');
  }

  hasAnyRole(required: readonly string[]): Observable<boolean> {
    return this.user$.pipe(map((u) => !!u && u.roles.some((r) => required.includes(r))));
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
    if (!this.accessToken) return of(null);

    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((u) => this.userSubject.next(u)),
      catchError(() => {
        this.tokenStorage.clear();
        this.userSubject.next(null);
        return of(null);
      })
    );
  }
}
