import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, finalize, take, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { User } from '../../../core/models/user.model';
import { UsersFacade } from '../data/users.facade';
import { ConfirmDeleteUserDialogComponent } from '../ui/confirm-delete-user-dialog.component';
import { UserDrawerComponent } from '../ui/user-drawer.component';
import { FormControl } from '@angular/forms';
import { TableSearchComponent } from '../../../shared/table/table-search.component';

@Component({
  selector: 'app-users-shell-page',
  standalone: true,
  imports: [
    TableSearchComponent,
    CommonModule,
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

  // Pagination et tri vivent dans le bloc @if (vm$ | async) : ils n'existent qu'après la première
  // réponse du backend. On les rattache au tableau à leur apparition (ngAfterViewInit est trop tôt).
  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p && this.dataSource.paginator !== p) this.dataSource.paginator = p;
  }
  @ViewChild(MatSort) set sort(s: MatSort | undefined) {
    if (s && this.dataSource.sort !== s) this.dataSource.sort = s;
  }
  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['username', 'fullName', 'roles', 'active', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<User>([]);
  readonly search = new FormControl<string>('', { nonNullable: true });

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: any = null;

  constructor() {
    this.dataSource.filterPredicate = (row: User, filter: string) => (`${row.username} ${row.fullName ?? ''} ${(row.roles ?? []).join(' ')}`).toLowerCase().includes(filter);
    this.search.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((v) => {
      this.dataSource.filter = v.trim().toLowerCase();
      this.dataSource.paginator?.firstPage();
    });
    this.facade.refresh();
  }

  ngAfterViewInit(): void {

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = vm;
      this.dataSource.data = vm.items;
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

    (this.facade.setActive(u.id, ev.checked) as any)
      .pipe(
        take(1),
        finalize(() => {})
      )
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

        (this.facade.delete(u.id) as any)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Utilisateur désactivé', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
