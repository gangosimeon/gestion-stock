import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** Champ de recherche du modèle de tableau (même rendu que la liste des produits). */
@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="data-table-search" subscriptSizing="dynamic">
      <mat-label>Rechercher</mat-label>
      <input matInput [formControl]="control" [placeholder]="placeholder" />
      @if (control.value) {
        <button mat-icon-button matSuffix type="button" (click)="control.setValue('')" aria-label="Vider">
          <mat-icon>close</mat-icon>
        </button>
      }
    </mat-form-field>
  `,
  styles: [':host { display: contents; }']
})
export class TableSearchComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input() placeholder = '';
}
