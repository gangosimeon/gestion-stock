import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Appointment } from '../../../core/models/appointment.model';

export type CancelAppointmentDialogData = {
  appointment: Appointment;
};

/** Demande le motif d'annulation ; renvoie le motif, ou rien si l'utilisateur renonce. */
@Component({
  selector: 'app-cancel-appointment-dialog',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Annuler le rendez-vous</h2>
    <div mat-dialog-content>
      <p>
        <strong>{{ data.appointment.customerName }}</strong> — {{ data.appointment.dateTime | date: 'dd/MM/yyyy HH:mm' }}
      </p>
      <p class="hint">Le rendez-vous reste dans l'historique, avec ce motif ; son créneau est libéré.</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Motif de l'annulation</mat-label>
        <textarea matInput [formControl]="reason" rows="3" maxlength="500"></textarea>
        @if (reason.touched && reason.invalid) {
          <mat-error>Motif obligatoire</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Ne pas annuler</button>
      <button mat-flat-button color="warn" type="button" (click)="confirm()">Annuler le rendez-vous</button>
    </div>
  `,
  styles: [
    `
      .full {
        width: 100%;
      }
      .hint {
        font-size: 13px;
        color: var(--color-text-secondary);
      }
    `
  ]
})
export class CancelAppointmentDialogComponent {
  private readonly ref = inject(MatDialogRef<CancelAppointmentDialogComponent, string>);
  readonly data = inject<CancelAppointmentDialogData>(MAT_DIALOG_DATA);

  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] });

  confirm(): void {
    const value = this.reason.value.trim();
    if (!value) {
      this.reason.setValue('');
      this.reason.markAsTouched();
      return;
    }
    this.ref.close(value);
  }
}
