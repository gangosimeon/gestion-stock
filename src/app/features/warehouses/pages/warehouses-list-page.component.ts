import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, combineLatest, firstValueFrom, map, of, take } from 'rxjs';

import { Warehouse } from '../../../core/models/warehouse.model';
import { WarehouseTypeFilter, WarehousesApiService } from '../../../core/services/warehouses-api.service';
import { ActiveStatusFilter } from '../../../core/services/products-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { confirmWith } from '../../../shared/dialog/confirm-dialog.component';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { WarehouseDrawerComponent, WarehouseDrawerContext } from '../ui/warehouse-drawer.component';
import {
  WarehouseDetailsDialogComponent,
  WarehouseDetailsDialogData,
  WarehouseDetailsDialogResult
} from '../ui/warehouse-details-dialog.component';

@Component({
  selector: 'app-warehouses-list-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatSelectModule,
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSidenavModule,
    MatTooltipModule,
    WarehouseDrawerComponent
  ],
  templateUrl: './warehouses-list-page.component.html',
  styleUrl: './warehouses-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WarehousesListPageComponent {
  private readonly api = inject(WarehousesApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackbar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly warehouseCtx = inject(WarehouseContextService);
  /** Après chaque opération : liste rechargée (le sélecteur de l'en-tête est revalidé à part). */
  private readonly changed$ = new Subject<void>();

  /** Interface seulement : le backend exige warehouse:manage pour administrer un dépôt. */
  readonly canManage$ = this.auth.hasPermission$('warehouse:manage');
  /** Dépôt principal : choix pour toute l'entreprise, réservé à warehouse:all. */
  readonly canSeeAll$ = this.auth.hasPermission$('warehouse:all');
  /** Filtre de statut (désactivés compris) : warehouse:all, ou warehouse:manage dans son périmètre. */
  readonly canFilterStatus$ = combineLatest([this.canManage$, this.canSeeAll$]).pipe(map(([m, a]) => m || a));
  /** Colonnes affichées : le détail pour tous, les actions d'administration selon warehouse:manage (dans la cellule). */
  readonly columns$: Observable<readonly string[]> = of(['code', 'name', 'type', 'main', 'active', 'actions']);

  readonly typeLabels: Record<WarehouseTypeFilter, string> = { STORE: 'Magasin', WAREHOUSE: 'Entrepôt' };
  readonly typeOptions = Object.entries(this.typeLabels).map(([value, label]) => ({ value: value as WarehouseTypeFilter, label }));
  readonly statusOptions: { value: ActiveStatusFilter; label: string }[] = [
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'INACTIVE', label: 'Désactivés' },
    { value: 'ALL', label: 'Tous' }
  ];

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.api.findPage(query, query.filters), {
    filters: new FormGroup({
      type: new FormControl<WarehouseTypeFilter | null>(null),
      status: new FormControl<ActiveStatusFilter>('ACTIVE', { nonNullable: true })
    }),
    sortFields: { code: 'code', name: 'name', type: 'type' },
    reload$: this.changed$
  });

  @ViewChild('drawer') drawer!: MatDrawer;

  /** Dépôt ouvert dans le panneau latéral (null : panneau fermé). */
  drawerCtx: WarehouseDrawerContext | null = null;

  typeLabel(w: Warehouse): string {
    return (w.type && this.typeLabels[w.type as WarehouseTypeFilter]) || w.type || '—';
  }

  openCreate(): void {
    this.openDrawer(null);
  }

  edit(w: Warehouse): void {
    this.openDrawer(w);
  }

  /** Détail en lecture seule ; « Modifier » ouvre le panneau de modification. */
  async openDetails(w: Warehouse): Promise<void> {
    const canEdit = await firstValueFrom(this.canManage$);
    this.dialog
      .open<WarehouseDetailsDialogComponent, WarehouseDetailsDialogData, WarehouseDetailsDialogResult>(
        WarehouseDetailsDialogComponent,
        { data: { warehouse: w, typeLabel: this.typeLabel(w), canEdit }, width: '520px', maxWidth: '95vw' }
      )
      .afterClosed()
      .pipe(take(1))
      .subscribe((result) => {
        if (result === 'edit') this.edit(w);
      });
  }

  closeDrawer(): void {
    void this.drawer.close();
  }

  onSaved(saved: Warehouse): void {
    const created = !this.drawerCtx?.warehouse;
    this.closeDrawer();
    this.done(created ? `Dépôt « ${saved.name} » ajouté${saved.code ? ` (${saved.code})` : ''}` : `Dépôt « ${saved.name} » modifié`);
  }


  async toggleActive(w: Warehouse): Promise<void> {
    const activate = w.active === false;
    if (!activate) {
      const confirmed = await confirmWith(this.dialog, {
        title: 'Désactiver le dépôt',
        message: `« ${w.name} » ne sera plus sélectionnable ni attribuable. Son stock et ses pièces sont conservés ; il pourra être réactivé.`,
        confirmLabel: 'Désactiver'
      });
      if (!confirmed) return;
    }
    this.api
      .setActive(w.id, activate)
      .pipe(take(1))
      .subscribe({ next: () => this.done(activate ? 'Dépôt réactivé' : 'Dépôt désactivé'), error: (e) => this.fail(e) });
  }

  async makeMain(w: Warehouse): Promise<void> {
    const confirmed = await confirmWith(this.dialog, {
      title: 'Dépôt principal',
      message: `« ${w.name} » deviendra le dépôt principal : celui des comptes sans dépôt attribué.`,
      confirmLabel: 'Désigner'
    });
    if (!confirmed) return;
    this.api.setMain(w.id).pipe(take(1)).subscribe({ next: () => this.done('Dépôt principal modifié'), error: (e) => this.fail(e) });
  }

  private openDrawer(warehouse: Warehouse | null): void {
    this.drawerCtx = { warehouse };
    this.cdr.markForCheck();
    void this.drawer.open();
  }

  /** Liste rechargée et sélecteur de l'en-tête revalidé (nom changé, dépôt désactivé…), sans recharger la page. */
  private done(message: string): void {
    this.snackbar.open(message, 'OK', { duration: 2500 });
    this.changed$.next();
    this.warehouseCtx.requestRevalidation();
  }

  private fail(e: unknown): void {
    this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 });
  }
}
