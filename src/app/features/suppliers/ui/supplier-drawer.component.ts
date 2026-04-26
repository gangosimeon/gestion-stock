import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { CreateSupplierRequest, UpdateSupplierRequest } from '../../../core/services/suppliers-api.service';
import { SuppliersFacade } from '../data/suppliers.facade';
import { SupplierDrawerMode } from '../data/suppliers-vm.model';

export interface SupplierDrawerContext {
  mode: SupplierDrawerMode;
  supplier: Supplier | null;
}

@Component({
  selector: 'app-supplier-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './supplier-drawer.component.html',
  styleUrl: './supplier-drawer.component.scss'
})
export class SupplierDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(SuppliersFacade);
  private readonly snackbar = inject(MatSnackBar);

  @Input({ required: true }) ctx!: SupplierDrawerContext;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.email, Validators.maxLength(200)]],
    address: ['', [Validators.maxLength(400)]],
    deliveryLeadTimeDays: [1, [Validators.required, Validators.min(0), Validators.max(365)]]
  });

  ngOnChanges(): void {
    const s = this.ctx.supplier;

    if (this.ctx.mode === 'EDIT' && s) {
      this.form.patchValue(
        {
          name: s.name,
          phone: s.phone ?? '',
          email: s.email ?? '',
          address: s.address ?? '',
          deliveryLeadTimeDays: s.deliveryLeadTimeDays
        },
        { emitEvent: false }
      );
      return;
    }

    this.form.reset(
      {
        name: '',
        phone: '',
        email: '',
        address: '',
        deliveryLeadTimeDays: 1
      },
      { emitEvent: false }
    );
  }

  get title(): string {
    return this.ctx.mode === 'CREATE' ? 'Nouveau fournisseur' : 'Modifier le fournisseur';
  }

  submit(): void {
    if (this.isSubmitting || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting = true;
    this.form.disable();

    const payload: CreateSupplierRequest | UpdateSupplierRequest = {
      name: raw.name.trim(),
      phone: raw.phone.trim() ? raw.phone.trim() : undefined,
      email: raw.email.trim() ? raw.email.trim() : undefined,
      address: raw.address.trim() ? raw.address.trim() : undefined,
      deliveryLeadTimeDays: raw.deliveryLeadTimeDays
    };

    const op$ =
      this.ctx.mode === 'CREATE'
        ? (this.facade.create(payload as CreateSupplierRequest) as any)
        : (this.facade.update(this.ctx.supplier?.id ?? '', payload as UpdateSupplierRequest) as any);

    op$
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Fournisseur enregistré', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  requestClose(): void {
    this.close.emit();
  }

  fieldError(path: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[path];
    if (!c.touched || !c.errors) return null;

    if (c.errors['required']) return 'Champ obligatoire';
    if (c.errors['email']) return 'Email invalide';
    if (c.errors['min'] || c.errors['max']) return 'Valeur invalide';
    if (c.errors['maxlength']) return 'Trop long';

    return 'Invalide';
  }
}
