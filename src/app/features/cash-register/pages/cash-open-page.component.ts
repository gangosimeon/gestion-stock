import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { CashRegisterFacade } from '../data/cash-register.facade';

@Component({
  selector: 'app-cash-open-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './cash-open-page.component.html',
  styleUrl: './cash-open-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashOpenPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(CashRegisterFacade);
  private readonly snackbar = inject(MatSnackBar);

  isSubmitting = false;

  readonly vm$ = this.facade.vm$;

  readonly form = this.fb.nonNullable.group({
    openingBalance: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    this.facade.refresh();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.form.disable();

    (this.facade.open({ openingBalance: this.form.controls.openingBalance.value }) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
          this.form.enable();
        })
      )
      .subscribe({
        next: () => this.snackbar.open('Caisse ouverte', 'OK', { duration: 2500 }),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
