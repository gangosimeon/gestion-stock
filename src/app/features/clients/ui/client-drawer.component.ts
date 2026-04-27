import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { CreateCustomerRequest, UpdateCustomerRequest } from '../../../core/services/customers-api.service';
import { ClientsFacade } from '../data/clients.facade';
import { ClientDrawerMode } from '../data/clients-vm.model';

export interface ClientDrawerContext {
  mode: ClientDrawerMode;
  customerId: string | null;
  customers: Customer[];
}

@Component({
  selector: 'app-client-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './client-drawer.component.html',
  styleUrl: './client-drawer.component.scss'
})
export class ClientDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(ClientsFacade);
  private readonly snackbar = inject(MatSnackBar);

  @Input({ required: true }) ctx!: ClientDrawerContext;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  isSubmitting = false;

  loaded: Customer | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    phone: [''],
    email: [''],
    creditLimit: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnChanges(): void {
    this.loaded = null;

    if (this.ctx.mode === 'CREATE') {
      this.form.reset({ name: '', phone: '', email: '', creditLimit: 0 }, { emitEvent: false });
      this.form.enable({ emitEvent: false });
      return;
    }

    const c = this.ctx.customers.find((x) => x.id === this.ctx.customerId) ?? null;
    this.loaded = c;
    if (!c) return;

    this.form.reset(
      {
        name: c.name,
        phone: c.phone ?? '',
        email: c.email ?? '',
        creditLimit: c.creditLimit ?? 0
      },
      { emitEvent: false }
    );

    this.form.enable({ emitEvent: false });
  }

  get title(): string {
    return this.ctx.mode === 'CREATE' ? 'Nouveau client' : 'Modifier client';
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payloadBase = {
      name: raw.name.trim(),
      phone: raw.phone.trim() ? raw.phone.trim() : undefined,
      email: raw.email.trim() ? raw.email.trim() : undefined,
      creditLimit: Number(raw.creditLimit)
    };

    if (!payloadBase.name) {
      this.snackbar.open('Nom requis', 'OK', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    const req$ =
      this.ctx.mode === 'CREATE'
        ? (this.facade.create(payloadBase satisfies CreateCustomerRequest) as any)
        : (this.facade.update(this.ctx.customerId as string, payloadBase satisfies UpdateCustomerRequest) as any);

    req$
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Enregistré', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  requestClose(): void {
    this.close.emit();
  }
}
