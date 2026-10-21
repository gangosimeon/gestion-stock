import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Données du dialogue : lien construit par la page, jamais conservé. */
export interface AccessLinkDialogData {
  username: string;
  url: string;
  expiresAt: string;
}

/**
 * Lien de définition du mot de passe d'un employé : montré une seule fois, à transmettre directement
 * à l'intéressé. Son mot de passe actuel reste valable tant que le lien n'a pas servi.
 */
@Component({
  selector: 'app-access-link-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Lien d'accès pour {{ data.username }}</h2>
    <mat-dialog-content>
      <p>
        À transmettre directement à l'utilisateur : il choisira son mot de passe. Valable une fois, jusqu'au
        {{ data.expiresAt | date: 'dd/MM/yyyy HH:mm' }}. Ce lien ne sera plus affiché.
      </p>
      <div class="link">
        <input [value]="data.url" readonly aria-label="Lien d'accès" (focus)="$any($event.target).select()" />
        <button mat-icon-button type="button" (click)="copy()" aria-label="Copier le lien"><mat-icon>content_copy</mat-icon></button>
      </div>
      @if (copied) {
        <p class="copied">Lien copié.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close type="button">Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .link {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: 1px dashed var(--color-primary);
        border-radius: 8px;
        background: var(--color-primary-soft);
      }
      .link input {
        flex: 1;
        border: 0;
        background: transparent;
        font-family: monospace;
        font-size: 12px;
      }
      .copied {
        color: var(--color-success);
      }
    `
  ]
})
export class AccessLinkDialogComponent {
  readonly data = inject<AccessLinkDialogData>(MAT_DIALOG_DATA);
  copied = false;
  private readonly cdr = inject(ChangeDetectorRef);

  copy(): void {
    navigator.clipboard?.writeText(this.data.url).then(
      () => {
        this.copied = true;
        this.cdr.markForCheck();
      },
      () => (this.copied = false)
    );
  }
}
