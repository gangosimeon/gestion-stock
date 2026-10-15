import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  /** Libellé du bouton de confirmation (« Confirmer » par défaut). */
  confirmLabel?: string;
}

/** Demande de confirmation générique : se ferme sur `true` (confirmé) ou `false` / rien (annulé). */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <div mat-dialog-content>
      <p>{{ data.message }}</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Annuler</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="true">{{ data.confirmLabel ?? 'Confirmer' }}</button>
    </div>
  `
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Ouvre la confirmation et résout `true` seulement si l'utilisateur confirme. */
export async function confirmWith(dialog: MatDialog, data: ConfirmDialogData): Promise<boolean> {
  const ref = dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data });
  return (await firstValueFrom(ref.afterClosed())) === true;
}
