import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Warehouse } from '../../../core/models/warehouse.model';

export type WarehouseDetailsDialogData = {
  warehouse: Warehouse;
  typeLabel: string;
  /** Bouton « Modifier » (warehouse:manage, interface seulement) : ferme la fenêtre avec 'edit'. */
  canEdit: boolean;
};

/** Résultat : 'edit' pour ouvrir le panneau de modification, sinon rien. */
export type WarehouseDetailsDialogResult = 'edit' | undefined;

/** Fenêtre de détail d'un dépôt (lecture seule), même présentation que le détail du journal d'audit. */
@Component({
  selector: 'app-warehouse-details-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">{{ w.type === 'WAREHOUSE' ? 'warehouse' : 'storefront' }}</mat-icon>
      {{ w.name }}
    </h2>

    <div mat-dialog-content>
      <div class="detail-grid">
        <span class="detail-label">Code</span>
        <span class="detail-value">{{ w.code || '—' }}</span>

        <span class="detail-label">Type</span>
        <span class="detail-value">{{ data.typeLabel }}</span>

        <span class="detail-label">Statut</span>
        <span class="detail-value">
          <span [class]="w.active === false ? 'badge badge--neutral' : 'badge badge--success'">
            {{ w.active === false ? 'Désactivé' : 'Actif' }}
          </span>
          @if (w.main) {
            <span class="badge badge--info">Dépôt principal</span>
          }
        </span>

        <span class="detail-label">Adresse</span>
        <span class="detail-value">{{ w.address || '—' }}</span>

        <span class="detail-label">Téléphone</span>
        <span class="detail-value">{{ w.phone || '—' }}</span>

        <span class="detail-label">Créé le</span>
        <span class="detail-value">{{ w.createdAt ? (w.createdAt | date: 'dd/MM/yyyy HH:mm') : '—' }}</span>

        <span class="detail-label">Modifié le</span>
        <span class="detail-value">{{ w.updatedAt ? (w.updatedAt | date: 'dd/MM/yyyy HH:mm') : '—' }}</span>
      </div>

      @if (w.main) {
        <p class="note">Dépôt de repli des utilisateurs sans dépôt attribué ; il ne peut pas être désactivé.</p>
      }
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Fermer</button>
      @if (data.canEdit) {
        <button mat-flat-button color="primary" type="button" [mat-dialog-close]="'edit'">
          <mat-icon>edit</mat-icon>
          Modifier
        </button>
      }
    </div>
  `,
  styles: [`
    .title-icon {
      vertical-align: middle;
      margin-right: 8px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px 16px;
      font-size: 13px;
      min-width: min(420px, 80vw);
    }
    .detail-label {
      color: var(--color-text-secondary);
      font-weight: 500;
    }
    .detail-value {
      color: var(--color-text);
      word-break: break-word;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .note {
      margin: 16px 0 0;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  `]
})
export class WarehouseDetailsDialogComponent {
  readonly data = inject<WarehouseDetailsDialogData>(MAT_DIALOG_DATA);
  readonly w = this.data.warehouse;
}
