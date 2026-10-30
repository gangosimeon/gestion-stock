import { Component, input, output } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { LinkWarehouseChoice } from '../data/integration-links-api.service';

/**
 * Choix des dépôts vendables d'une liaison boutique (GA1 à l'approbation, GA2 à la réactivation) : une case par
 * dépôt, l'avertissement des entrepôts, et le rappel « au moins un dépôt ». La sélection appartient à l'écran
 * parent (présélection, envoi) ; ce composant affiche et signale chaque changement.
 */
@Component({
  selector: 'app-link-warehouse-picker',
  standalone: true,
  imports: [MatCheckboxModule],
  template: `
    <fieldset class="picker">
      <legend>{{ legend() }}</legend>
      @for (warehouse of warehouses(); track warehouse.id) {
        <div class="picker-warehouse" [attr.data-warehouse]="warehouse.id">
          <mat-checkbox
            [checked]="selected().has(warehouse.id)"
            [disabled]="!warehouse.active || disabled()"
            (change)="toggled.emit({ warehouse, checked: $event.checked })"
          >
            {{ warehouse.name }}
            <span class="picker-type">{{ warehouse.type === 'STORE' ? 'Magasin' : 'Entrepôt' }}</span>
          </mat-checkbox>
          @if (warehouse.type !== 'STORE') {
            <p class="picker-warning">À cocher seulement si vous expédiez depuis ce dépôt.</p>
          }
        </div>
      } @empty {
        <p class="picker-warning">Aucun dépôt accessible : demandez l’accès à un dépôt actif.</p>
      }
      @if (selected().size === 0) {
        <p class="picker-hint">Choisissez au moins un dépôt.</p>
      }
    </fieldset>
  `,
  styles: `
    .picker {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 12px 16px;
      margin: 20px 0;

      legend {
        font-weight: 600;
        padding: 0 4px;
      }
    }

    .picker-warehouse {
      padding: 4px 0;
      overflow-wrap: anywhere;
    }

    .picker-type {
      color: var(--color-neutral-text);
      font-size: 0.85em;
      margin-left: 4px;
    }

    .picker-warning {
      margin: 0 0 4px 40px;
      font-size: 0.875rem;
      color: var(--color-warning-text);
    }

    .picker-hint {
      margin: 8px 0 0;
      font-size: 0.875rem;
      color: var(--color-danger-text);
    }
  `
})
export class LinkWarehousePickerComponent {
  readonly warehouses = input.required<readonly LinkWarehouseChoice[]>();
  readonly selected = input.required<ReadonlySet<string>>();
  readonly disabled = input(false);
  readonly legend = input('Dépôts dont la boutique vend le stock');
  readonly toggled = output<{ warehouse: LinkWarehouseChoice; checked: boolean }>();
}
