import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { LinkWarehouseChoice } from '../data/integration-links-api.service';
import { LinkWarehousePickerComponent } from './link-warehouse-picker.component';

/** Données de la reconfirmation des dépôts à la réactivation. */
export interface ReactivateLinkDialogData {
  shopName: string;
  /** Dépôts actifs accessibles à la personne connectée. */
  candidates: LinkWarehouseChoice[];
  /** Dépôts actuels de la liaison. */
  current: LinkWarehouseChoice[];
}

/**
 * Réactivation d'une liaison suspendue (v14-D10) : reconfirmation obligatoire des dépôts, avec le même choix qu'à
 * l'approbation (GA1). Présélection : les dépôts de la liaison encore accessibles à la personne connectée. Se ferme
 * sur la liste choisie (au moins un dépôt), ou sur rien si la personne annule.
 */
@Component({
  selector: 'app-reactivate-link-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, LinkWarehousePickerComponent],
  template: `
    <h2 mat-dialog-title>Réactiver la liaison avec {{ data.shopName }}</h2>
    <div mat-dialog-content>
      <p>
        Confirmez les dépôts dont la boutique vendra le stock. En réactivant, vous devenez responsable de cette liaison.
      </p>
      @if (lost().length > 0) {
        <p class="reactivate-lost">
          Dépôts de la liaison qui ne vous sont plus accessibles :
          @for (warehouse of lost(); track warehouse.id) {
            <span class="reactivate-lost-name">{{ warehouse.name }}</span>
          }
        </p>
      }
      <app-link-warehouse-picker
        [warehouses]="data.candidates"
        [selected]="selected()"
        (toggled)="toggle($event.warehouse.id, $event.checked)"
      />
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Annuler</button>
      <button mat-flat-button color="primary" type="button" data-test="confirm" [disabled]="selected().size === 0" (click)="confirm()">
        Réactiver
      </button>
    </div>
  `,
  styles: `
    .reactivate-lost {
      color: var(--color-warning-text);
    }

    .reactivate-lost-name:not(:last-child)::after {
      content: ', ';
    }
  `
})
export class ReactivateLinkDialogComponent {
  readonly data = inject<ReactivateLinkDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ReactivateLinkDialogComponent, string[] | undefined>);

  readonly selected = signal<ReadonlySet<string>>(
    new Set(this.data.current.map((w) => w.id).filter((id) => this.data.candidates.some((c) => c.id === id)))
  );

  /** Dépôts de la liaison que la personne connectée ne peut plus choisir. */
  readonly lost = computed(() => this.data.current.filter((w) => !this.data.candidates.some((c) => c.id === w.id)));

  toggle(id: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(id);
    else next.delete(id);
    this.selected.set(next);
  }

  confirm(): void {
    if (this.selected().size === 0) return;
    // Ordre de la liste proposée : un envoi stable.
    this.ref.close(this.data.candidates.filter((w) => this.selected().has(w.id)).map((w) => w.id));
  }

  cancel(): void {
    this.ref.close(undefined);
  }
}
