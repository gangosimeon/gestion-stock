import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ServerTable } from './server-table';

/**
 * Bouton « Réinitialiser » d'une barre de filtres : vide la recherche et remet chaque filtre à
 * sa valeur de départ. Grisé tant qu'aucun critère n'est saisi. À placer en dernier dans la
 * barre (`.filter-bar` ou `.data-table-toolbar`) : il s'aligne à droite.
 *
 * ```html
 * <app-filter-reset [table]="table" />
 * ```
 */
@Component({
  selector: 'app-filter-reset',
  imports: [AsyncPipe, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'filter-bar__actions' },
  template: `
    <button mat-stroked-button type="button" (click)="table().reset()" [disabled]="(table().filtered$ | async) === false">
      <mat-icon>clear</mat-icon> Réinitialiser
    </button>
  `
})
export class FilterResetComponent {
  readonly table = input.required<ServerTable<unknown, FormGroup>>();
}
