import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, of } from 'rxjs';

import { User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';
import { AuthService as NewAuthService } from '../../auth/services/auth.service';

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
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly newAuth = inject(NewAuthService);

  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor() {
    this.newAuth.currentUser$.subscribe((u) => {
      if (u) {
        this.userSubject.next({
          id: u.id,
          username: u.username,
          fullName: u.username,
          email: u.email,
          roles: u.role ? [u.role as unknown as any] : [],
          isActive: true
        } as User);
      } else {
        this.userSubject.next(null);
      }
    });
  }

  get accessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  logout(): void {
    this.tokenStorage.clear();
    this.userSubject.next(null);
    void this.router.navigateByUrl('/login');
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
    return of(null);
  }
}
