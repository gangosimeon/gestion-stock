import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/** Données de la révocation. */
export interface RevokeLinkDialogData {
  shopName: string;
}

/**
 * Révocation d'une liaison : confirmation renforcée (case explicite), puisque l'action est irréversible. Se
 * ferme sur `true` seulement si la personne a coché la case puis confirmé.
 */
@Component({
  selector: 'app-revoke-link-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>Révoquer la liaison avec {{ data.shopName }} ?</h2>
    <div mat-dialog-content>
      <p>
        La révocation est définitive : la boutique perd immédiatement tout accès à votre entreprise et ne pourra pas
        être réactivée. Pour la reconnecter, la boutique devra demander une nouvelle liaison.
      </p>
      <mat-checkbox data-test="understood" [checked]="understood()" (change)="understood.set($event.checked)">
        Je comprends que cette révocation est définitive.
      </mat-checkbox>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Annuler</button>
      <button mat-flat-button color="warn" type="button" data-test="confirm" [disabled]="!understood()" (click)="confirm()">
        Révoquer définitivement
      </button>
    </div>
  `
})
export class RevokeLinkDialogComponent {
  readonly data = inject<RevokeLinkDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RevokeLinkDialogComponent, boolean>);
  readonly understood = signal(false);

  confirm(): void {
    if (this.understood()) this.ref.close(true);
  }
}
