import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Warehouse } from '../../../core/models/warehouse.model';
import { UpdateWarehouseRequest, WarehouseTypeFilter } from '../../../core/services/warehouses-api.service';

/**
 * Modification d'un dépôt : code, nom, type et coordonnées. Les règles (code et nom uniques,
 * format du code) sont vérifiées par le backend ; le dialogue renvoie la demande, ou rien.
 */
@Component({
  selector: 'app-warehouse-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Modifier le dépôt</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <div mat-dialog-content class="warehouse-edit">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" />
          <mat-hint>Majuscules, chiffres et tirets (ex. MAG-02).</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nom</mat-label>
          <input matInput formControlName="name" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <mat-error>Nom obligatoire (2 caractères au moins)</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="STORE">Magasin</mat-option>
            <mat-option value="WAREHOUSE">Entrepôt</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Adresse</mat-label>
          <input matInput formControlName="address" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Téléphone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button color="primary" type="submit">Enregistrer</button>
      </div>
    </form>
  `,
  styles: ['.warehouse-edit { display: flex; flex-direction: column; gap: 4px; min-width: min(420px, 80vw); }']
})
export class WarehouseEditDialogComponent {
  private readonly ref = inject(MatDialogRef<WarehouseEditDialogComponent, UpdateWarehouseRequest>);
  private readonly warehouse = inject<Warehouse>(MAT_DIALOG_DATA);

  readonly form = inject(FormBuilder).nonNullable.group({
    code: [this.warehouse.code ?? ''],
    name: [this.warehouse.name, [Validators.required, Validators.minLength(2)]],
    type: [(this.warehouse.type as WarehouseTypeFilter | undefined) ?? 'STORE'],
    address: [this.warehouse.address ?? ''],
    phone: [this.warehouse.phone ?? '']
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.ref.close({
      code: raw.code.trim() || undefined,
      name: raw.name.trim(),
      type: raw.type,
      address: raw.address.trim() || undefined,
      phone: raw.phone.trim() || undefined
    });
  }
}
