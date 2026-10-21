import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PlatformAuthService } from './data/platform-auth.service';

/** Mise en page de l'espace Super Admin : navigation propre, séparée de l'application des entreprises. */
@Component({
  selector: 'app-platform-shell',
  standalone: true,
  imports: [AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  template: `
    <div class="platform-shell">
      <header class="platform-shell__bar">
        <span class="platform-shell__brand">
          <mat-icon>admin_panel_settings</mat-icon>
          GestStock — Super Admin
        </span>
        <nav class="platform-shell__nav" aria-label="Navigation Super Admin">
          <a routerLink="/platform/dashboard" routerLinkActive="active">Tableau de bord</a>
          <a routerLink="/platform/companies" routerLinkActive="active">Entreprises</a>
          <a routerLink="/platform/audit" routerLinkActive="active">Journal</a>
        </nav>
        <span class="platform-shell__spacer"></span>
        @if (auth.admin$ | async; as admin) {
          <span class="platform-shell__user">{{ admin.fullName }}</span>
        }
        <a mat-button routerLink="/platform/change-password">Mot de passe</a>
        <button mat-stroked-button type="button" (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
          Déconnexion
        </button>
      </header>
      <main class="platform-shell__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .platform-shell {
        min-height: 100vh;
        background: var(--color-bg);
      }
      .platform-shell__bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        padding: 10px var(--page-padding);
        background: #0b1f3a;
        color: #fff;
      }
      .platform-shell__brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
      }
      .platform-shell__nav {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .platform-shell__nav a {
        color: #c8d2e0;
        text-decoration: none;
        padding: 6px 12px;
        border-radius: 8px;
      }
      .platform-shell__nav a.active,
      .platform-shell__nav a:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.12);
      }
      .platform-shell__spacer {
        flex: 1;
      }
      .platform-shell__user {
        color: #c8d2e0;
        font-size: 13px;
      }
      .platform-shell__bar .mat-mdc-button,
      .platform-shell__bar .mat-mdc-outlined-button {
        --mat-button-text-label-text-color: #fff;
        --mat-button-outlined-label-text-color: #fff;
        --mat-button-outlined-outline-color: rgba(255, 255, 255, 0.4);
      }
      .platform-shell__content {
        padding: var(--page-padding);
        max-width: 1400px;
        margin: 0 auto;
      }
    `
  ]
})
export class PlatformShellComponent {
  readonly auth = inject(PlatformAuthService);
}
