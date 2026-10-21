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

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { User } from '../../../core/models/user.model';
import { WarehousesApiService } from '../../../core/services/warehouses-api.service';
import { Role } from '../../../core/models/role.model';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { UsersFacade } from '../data/users.facade';
import { UsersVm, roleLabels } from '../data/users-vm.model';
import { ConfirmDeleteUserDialogComponent } from '../ui/confirm-delete-user-dialog.component';
import { UserDrawerComponent } from '../ui/user-drawer.component';
import { AccessLinkDialogComponent } from '../ui/access-link-dialog.component';
import { UsersApiService } from '../../../core/services/users-api.service';
import { AuthService } from '../../../auth/services/auth.service';
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
  private readonly usersApi = inject(UsersApiService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['username', 'fullName', 'roles', 'warehouses', 'active', 'actions'] as const;

  /** Noms des dépôts visibles, pour la colonne « Dépôts » (identifiants renvoyés par le backend). */
  private warehouseNames = new Map<string, string>();

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

  constructor() {
    this.warehousesApi
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (r) => (this.warehouseNames = new Map(r.items.map((w) => [w.id, w.name]))), error: () => undefined });
  }

  /** Dépôts autorisés, le dépôt par défaut en premier ; « — » si aucun (dépôt principal). */
  warehousesOf(u: User): string {
    const ids = [...(u.warehouseIds ?? [])].sort((a, b) =>
      a === u.defaultWarehouseId ? -1 : b === u.defaultWarehouseId ? 1 : 0
    );
    if (ids.length === 0) return '—';
    return ids
      .map((id) => (this.warehouseNames.get(id) ?? 'Dépôt inconnu') + (id === u.defaultWarehouseId ? ' (par défaut)' : ''))
      .join(', ');
  }

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

  /** Lien de définition du mot de passe, affiché une seule fois. */
  sendAccessLink(u: User): void {
    if (!this.vmSnapshot?.canManage) return;
    this.usersApi.accessLink(u.id).subscribe({
      next: (link) => {
        const params = new URLSearchParams({ company: this.auth.companyCode ?? '', token: link.token });
        this.dialog.open(AccessLinkDialogComponent, {
          data: { username: u.username, url: `${window.location.origin}/activate?${params.toString()}`, expiresAt: link.expiresAt },
          width: '560px'
        });
      },
      error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
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
