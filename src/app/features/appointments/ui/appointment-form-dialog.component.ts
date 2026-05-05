import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';

import { Appointment, AppointmentStatus } from '../../../core/models/appointment.model';
import { AppointmentsApiService } from '../../../core/services/appointments-api.service';

export type AppointmentFormDialogData = {
  mode: 'create' | 'edit';
  appointment?: Appointment;
};

@Component({
  selector: 'app-appointment-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './appointment-form-dialog.component.html'
})
export class AppointmentFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AppointmentFormDialogComponent>);
  readonly data = inject<AppointmentFormDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppointmentsApiService);
  private readonly destroy$ = new Subject<void>();

  readonly statusOptions: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

  form: FormGroup;

  constructor() {
    const appointment = this.data.appointment;
    this.form = this.fb.group({
      customerName: [appointment?.customerName || '', Validators.required],
      phone: [appointment?.phone || '', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      dateTime: [appointment?.dateTime || '', Validators.required],
      status: [appointment?.status || 'SCHEDULED', Validators.required],
      note: [appointment?.note || '']
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSave(): void {
    if (this.form.invalid) return;

    const formValue = this.form.value;
    const data = {
      customerName: formValue.customerName,
      phone: formValue.phone,
      dateTime: new Date(formValue.dateTime).toISOString(),
      status: formValue.status,
      note: formValue.note || undefined
    };

    if (this.data.mode === 'create') {
      this.api.create(data).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.dialogRef.close(true),
        error: () => this.dialogRef.close(false)
      });
    } else {
      this.api.update(this.data.appointment!.id, data).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.dialogRef.close(true),
        error: () => this.dialogRef.close(false)
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
