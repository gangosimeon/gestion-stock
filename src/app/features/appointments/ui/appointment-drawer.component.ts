import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';

import { Appointment, AppointmentStatus } from '../../../core/models/appointment.model';
import { AppointmentsApiService } from '../../../core/services/appointments-api.service';

export type AppointmentDrawerContext = {
  mode: 'create' | 'edit';
  appointment?: Appointment;
};

@Component({
  selector: 'app-appointment-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './appointment-drawer.component.html',
  styleUrl: './appointment-drawer.component.scss'
})
export class AppointmentDrawerComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppointmentsApiService);
  private readonly destroy$ = new Subject<void>();

  @Input() context: AppointmentDrawerContext | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly statusOptions: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

  isSubmitting = false;
  form: FormGroup = this.buildForm();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['context']) {
      this.isSubmitting = false;
      this.form = this.buildForm();
    }
  }

  private buildForm(): FormGroup {
    const a = this.context?.appointment;
    const dt = a?.dateTime ? a.dateTime.substring(0, 16) : '';
    return this.fb.group({
      customerName: [a?.customerName ?? '', Validators.required],
      phone: [a?.phone ?? '', [Validators.required, Validators.pattern(/^[0-9+\s()-]+$/)]],
      dateTime: [dt, Validators.required],
      status: [a?.status ?? 'SCHEDULED', Validators.required],
      note: [a?.note ?? '']
    });
  }

  onSave(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const v = this.form.value;
    const payload = {
      customerName: v.customerName,
      phone: v.phone,
      dateTime: new Date(v.dateTime).toISOString(),
      status: v.status,
      note: v.note || undefined
    };

    const req$ = this.context?.mode === 'create'
      ? this.api.create(payload)
      : this.api.update(this.context!.appointment!.id, payload);

    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.isSubmitting = false; this.saved.emit(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
