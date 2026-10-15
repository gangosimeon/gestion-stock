import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { take } from 'rxjs';

import { Warehouse } from '../../../core/models/warehouse.model';
import {
  CreateWarehouseRequest,
  WarehouseTypeFilter,
  WarehousesApiService
} from '../../../core/services/warehouses-api.service';

/** Mode du panneau : création (warehouse = null) ou modification. */
export type WarehouseDrawerContext = { warehouse: Warehouse | null };

/** Mêmes règles que le backend (WarehouseRequest) : le refus s'affiche avant l'envoi. */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
const PHONE_PATTERN = /^[0-9+() .-]*$/;

/** Panneau latéral de création ou de modification d'un dépôt (même structure que celui des catégories). */
@Component({
  selector: 'app-warehouse-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './warehouse-drawer.component.html',
  styleUrl: './warehouse-drawer.component.scss'
})
export class WarehouseDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WarehousesApiService);

  @Input({ required: true }) ctx!: WarehouseDrawerContext;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Warehouse>();

  readonly typeOptions: { value: WarehouseTypeFilter; label: string; hint: string }[] = [
    { value: 'STORE', label: 'Magasin', hint: 'Point de vente : ventes et caisse. Code généré MAG-nn.' },
    { value: 'WAREHOUSE', label: 'Entrepôt', hint: 'Stockage. Code généré DEP-nn.' }
  ];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    type: this.fb.control<WarehouseTypeFilter | null>(null, Validators.required),
    code: this.fb.nonNullable.control('', [Validators.maxLength(20), Validators.pattern(CODE_PATTERN)]),
    address: this.fb.nonNullable.control('', [Validators.maxLength(255)]),
    phone: this.fb.nonNullable.control('', [Validators.maxLength(30), Validators.pattern(PHONE_PATTERN)])
  });

  saving = false;
  errorMessage: string | null = null;

  get editing(): boolean {
    return !!this.ctx?.warehouse;
  }

  get title(): string {
    return this.editing ? 'Modifier le dépôt' : 'Nouveau dépôt';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ctx']) {
      const w = this.ctx?.warehouse;
      this.saving = false;
      this.errorMessage = null;
      this.form.reset({
        name: w?.name ?? '',
        type: (w?.type as WarehouseTypeFilter | undefined) ?? null,
        code: w?.code ?? '',
        address: w?.address ?? '',
        phone: w?.phone ?? ''
      });
    }
  }

  typeHint(): string {
    const hint = this.typeOptions.find((t) => t.value === this.form.controls.type.value)?.hint ?? '';
    // En modification, le code existant est conservé : seule la vocation du type compte.
    return this.editing ? hint.replace(/ Code généré .*$/, '') : hint;
  }

  submit(): void {
    const name = this.form.controls.name.value.trim();
    if (this.form.invalid || !name || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    // Code vide : généré (création) ou conservé (modification). Adresse, téléphone vides : effacés.
    const payload: CreateWarehouseRequest = {
      name,
      type: raw.type ?? undefined,
      code: raw.code.trim() || undefined,
      address: raw.address.trim() || undefined,
      phone: raw.phone.trim() || undefined
    };
    const id = this.ctx.warehouse?.id;
    this.saving = true;
    this.errorMessage = null;
    (id ? this.api.update(id, payload) : this.api.create(payload)).pipe(take(1)).subscribe({
      next: (warehouse) => {
        this.saving = false;
        this.saved.emit(warehouse);
      },
      error: (e: unknown) => {
        this.saving = false;
        // Ex. : « Ce code de dépôt est déjà utilisé. » (refus du backend)
        this.errorMessage = e instanceof Error ? e.message : 'Erreur';
      }
    });
  }
}
