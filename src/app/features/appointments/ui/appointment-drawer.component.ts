import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, takeUntil } from 'rxjs';

import { Appointment, AppointmentRequest } from '../../../core/models/appointment.model';
import { Customer } from '../../../core/models/customer.model';
import { AppointmentsApiService } from '../../../core/services/appointments-api.service';
import { CustomersApiService } from '../../../core/services/customers-api.service';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';

export type AppointmentDrawerContext = {
  mode: 'create' | 'edit';
  appointment?: Appointment;
};

type Who = 'customer' | 'prospect';

/** Champ datetime-local : AAAA-MM-JJTHH:mm, heure locale du dépôt (aucune conversion de fuseau). */
function localInput(value: string | undefined): string {
  return value ? value.substring(0, 16) : '';
}

@Component({
  selector: 'app-appointment-drawer',
  standalone: true,
  imports: [
    DatePickerDirective,
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  templateUrl: './appointment-drawer.component.html',
  styleUrl: './appointment-drawer.component.scss'
})
export class AppointmentDrawerComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppointmentsApiService);
  private readonly customersApi = inject(CustomersApiService);
  private readonly destroy$ = new Subject<void>();

  @Input() context: AppointmentDrawerContext | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Appointment>();

  isSubmitting = false;
  errorMessage: string | null = null;
  /** Borne du sélecteur : maintenant, heure locale (le backend refuse un horaire passé). */
  minDateTime = this.nowLocal();
  who: Who = 'prospect';
  /** Client du fichier choisi (nom affiché ; le backend reprend sa fiche). */
  selectedCustomer: { id: string; name: string; phone?: string | null } | null = null;

  form: FormGroup = this.buildForm();
  customerOptions$: Observable<Customer[]> = of([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['context']) {
      this.isSubmitting = false;
      this.errorMessage = null;
      this.minDateTime = this.nowLocal();
      const a = this.context?.appointment;
      this.who = a?.customerId ? 'customer' : 'prospect';
      this.selectedCustomer = a?.customerId ? { id: a.customerId, name: a.customerName, phone: a.phone } : null;
      this.form = this.buildForm();
    }
  }

  private buildForm(): FormGroup {
    const a = this.context?.appointment;
    const form = this.fb.group({
      customerSearch: [a?.customerId ? a.customerName : ''],
      customerName: [a?.customerId ? '' : (a?.customerName ?? ''), [Validators.maxLength(200)]],
      phone: [a?.phone ?? '', [Validators.pattern(/^[0-9+() .-]*$/), Validators.maxLength(30)]],
      dateTime: [localInput(a?.dateTime), Validators.required],
      note: [a?.note ?? '', [Validators.maxLength(1000)]]
    });
    // Recherche serveur des clients actifs, au fil de la frappe.
    this.customerOptions$ = form.controls.customerSearch.valueChanges.pipe(
      startWith(''),
      map((v) => (typeof v === 'string' ? v.trim() : '')),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) =>
        q.length < 2
          ? of([] as Customer[])
          : this.customersApi.search(q).pipe(
              map((r) => r.items),
              catchError(() => of([] as Customer[]))
            )
      )
    );
    return form;
  }

  private nowLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  setWho(who: Who): void {
    this.who = who;
    this.errorMessage = null;
  }

  onCustomerSelected(event: MatAutocompleteSelectedEvent): void {
    const c = event.option.value as Customer;
    this.selectedCustomer = { id: c.id, name: c.name, phone: c.phone };
    this.form.patchValue({ customerSearch: c.name, phone: c.phone ?? '' });
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.form.patchValue({ customerSearch: '' });
  }

  onSave(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue() as { customerName: string; phone: string; dateTime: string; note: string };
    // Nouvel horaire déjà passé : refusé ici avant l'appel (même règle que le backend).
    const unchanged = this.context?.appointment && localInput(this.context.appointment.dateTime) === v.dateTime;
    if (!unchanged && v.dateTime <= this.nowLocal()) {
      this.errorMessage = 'Choisissez une date et une heure à venir.';
      return;
    }
    const payload: AppointmentRequest = {
      dateTime: v.dateTime,
      phone: v.phone?.trim() || undefined,
      note: v.note?.trim() || undefined
    };
    if (this.who === 'customer') {
      if (!this.selectedCustomer) {
        this.errorMessage = 'Choisissez un client dans la liste.';
        return;
      }
      payload.customerId = this.selectedCustomer.id;
    } else {
      payload.customerName = v.customerName?.trim() || undefined;
      if (!payload.customerName || !payload.phone) {
        this.errorMessage = 'Nom et téléphone du prospect obligatoires.';
        return;
      }
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    const req$ =
      this.context?.mode === 'edit' && this.context.appointment
        ? this.api.update(this.context.appointment.id, payload)
        : this.api.create(payload);

    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (a) => {
        this.isSubmitting = false;
        this.saved.emit(a);
      },
      error: (e: unknown) => {
        this.isSubmitting = false;
        this.errorMessage = e instanceof Error ? e.message : 'Erreur';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
