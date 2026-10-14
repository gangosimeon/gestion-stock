import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, Subject, take, takeUntil } from 'rxjs';

import { User } from '../../../core/models/user.model';
import { Role } from '../../../core/models/role.model';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { UsersFacade } from '../data/users.facade';
import { UsersVm, roleLabels } from '../data/users-vm.model';
import { ConfirmDeleteUserDialogComponent } from '../ui/confirm-delete-user-dialog.component';
import { UserDrawerComponent } from '../ui/user-drawer.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-users-shell-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AsyncPipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSidenavModule,
    MatDialogModule,
    MatSnackBarModule,
    UserDrawerComponent
  ],
  templateUrl: './users-shell-page.component.html',
  styleUrl: './users-shell-page.component.scss'
})
export class UsersShellPageComponent implements AfterViewInit, OnDestroy {
  readonly facade = inject(UsersFacade);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['username', 'fullName', 'roles', 'active', 'actions'] as const;

  readonly roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value: value as Role, label }));
  readonly activeOptions: { value: boolean; label: string }[] = [
    { value: true, label: 'Actifs' },
    { value: false, label: 'Désactivés' }
  ];

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({
      role: new FormControl<Role | null>(null),
      active: new FormControl<boolean | null>(null)
    }),
    sortFields: { username: 'username', fullName: 'fullName' },
    reload$: this.facade.refresh$
  });

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: UsersVm | null = null;
  /** Utilisateur ouvert dans le panneau (ligne de la page affichée). */
  editing: User[] = [];

  ngAfterViewInit(): void {

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = vm;
    });

    this.drawer$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      if (d.opened) void this.drawer.open();
      else void this.drawer.close();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreate(): void {
    if (!this.vmSnapshot?.canManage) return;
    this.facade.openCreate();
  }

  openEdit(u: User): void {
    if (!this.vmSnapshot?.canManage) return;
    this.editing = [u];
    this.facade.openEdit(u.id);
  }

  closeDrawer(): void {
    this.facade.closeDrawer();
  }

  onSaved(): void {
    this.facade.closeDrawer();
  }

  toggleActive(u: User, ev: MatSlideToggleChange): void {
    if (!this.vmSnapshot?.canManage) return;

    (this.facade.setActive(u.id, ev.checked) as Observable<unknown>)
      .pipe(take(1))
      .subscribe({
        next: () => this.snackbar.open('Statut mis à jour', 'OK', { duration: 2000 }),
        error: (e: unknown) => {
          // Refus du backend (ex. dernier administrateur actif) : l'interrupteur revient en place.
          ev.source.checked = !ev.checked;
          this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 });
        }
      });
  }

  confirmDelete(u: User): void {
    if (!this.vmSnapshot?.canManage) return;

    this.dialog
      .open(ConfirmDeleteUserDialogComponent, {
        data: {
          title: 'Supprimer utilisateur',
          message: `Supprimer ${u.fullName} (${u.username}) ? Le compte sera désactivé ; son historique est conservé.`
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok) => {
        if (!ok) return;

        (this.facade.delete(u.id) as Observable<unknown>)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Utilisateur désactivé', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
