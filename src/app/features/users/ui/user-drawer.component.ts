import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, take } from 'rxjs';

import { Role } from '../../../core/models/role.model';
import { User } from '../../../core/models/user.model';
import { CreateUserRequest, UpdateUserRequest } from '../../../core/services/users-api.service';
import { UsersFacade } from '../data/users.facade';
import { roleLabels, UserDrawerMode } from '../data/users-vm.model';

export interface UserDrawerContext {
  mode: UserDrawerMode;
  user: User | null;
}

@Component({
  selector: 'app-user-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './user-drawer.component.html',
  styleUrl: './user-drawer.component.scss'
})
export class UserDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(UsersFacade);
  private readonly snackbar = inject(MatSnackBar);

  @Input({ required: true }) ctx!: UserDrawerContext;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  isSubmitting = false;

  readonly roleOptions: Role[] = ['ADMIN', 'CAISSIER', 'GESTIONNAIRE'];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phone: [''],
    roles: [[] as Role[], [Validators.required]],
    isActive: [true]
  });

  ngOnChanges(): void {
    const u = this.ctx.user;
    if (this.ctx.mode === 'EDIT' && u) {
      this.form.patchValue(
        {
          username: u.username,
          fullName: u.fullName,
          phone: u.phone ?? '',
          roles: u.roles,
          isActive: u.isActive
        },
        { emitEvent: false }
      );
    } else {
      this.form.reset(
        {
          username: '',
          fullName: '',
          phone: '',
          roles: [],
          isActive: true
        },
        { emitEvent: false }
      );
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.isSubmitting = true;
    this.form.disable();

    const req$ =
      this.ctx.mode === 'CREATE'
        ? (this.facade.create({
            username: raw.username.trim(),
            fullName: raw.fullName.trim(),
            phone: raw.phone.trim() ? raw.phone.trim() : undefined,
            roles: raw.roles,
            isActive: raw.isActive
          } satisfies CreateUserRequest) as any)
        : (this.facade.update(this.ctx.user?.id ?? '', {
            username: raw.username.trim(),
            fullName: raw.fullName.trim(),
            phone: raw.phone.trim() ? raw.phone.trim() : undefined,
            roles: raw.roles
          } satisfies UpdateUserRequest) as any);

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
          this.snackbar.open('Utilisateur enregistré', 'OK', { duration: 2500 });
          this.saved.emit();
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  requestClose(): void {
    this.close.emit();
  }

  roleLabel(r: Role): string {
    return roleLabels[r];
  }

  fieldError(path: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[path];
    if (!c.touched || !c.errors) return null;

    if (c.errors['required']) return 'Champ obligatoire';
    if (c.errors['minlength']) return 'Trop court';

    return 'Invalide';
  }
}
