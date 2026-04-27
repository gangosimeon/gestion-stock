import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { CashRegisterFacade } from '../data/cash-register.facade';

@Component({
  selector: 'app-cash-close-page',
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
    MatSelectModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './cash-close-page.component.html',
  styleUrl: './cash-close-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashClosePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(CashRegisterFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);

  isSubmitting = false;

  readonly vm$ = this.facade.vm$;

  readonly operationForm = this.fb.nonNullable.group({
    type: ['IN' as const, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(1)]],
    note: ['']
  });

  readonly closeForm = this.fb.nonNullable.group({
    countedCash: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    this.facade.refresh();
  }

  difference(expected: number, counted: number): number {
    return Number(counted) - Number(expected);
  }

  addOperation(): void {
    if (this.operationForm.invalid || this.isSubmitting) {
      this.operationForm.markAllAsTouched();
      return;
    }

    const raw = this.operationForm.getRawValue();

    this.isSubmitting = true;

    (this.facade.addOperation({
      type: raw.type,
      amount: raw.amount,
      note: raw.note.trim() ? raw.note.trim() : undefined
    }) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Opération enregistrée', 'OK', { duration: 2500 });
          this.operationForm.reset({ type: 'IN', amount: 0, note: '' }, { emitEvent: false });
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  close(expectedCash: number): void {
    if (this.closeForm.invalid || this.isSubmitting) {
      this.closeForm.markAllAsTouched();
      return;
    }

    const countedCash = this.closeForm.controls.countedCash.value;

    this.isSubmitting = true;

    (this.facade.close({ countedCash }) as any)
      .pipe(
        take(1),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Caisse fermée', 'OK', { duration: 2500 });
          void this.router.navigateByUrl('/cash-register/history');
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }
}
