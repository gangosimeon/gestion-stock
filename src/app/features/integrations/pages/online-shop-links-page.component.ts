import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { confirmWith } from '../../../shared/dialog/confirm-dialog.component';
import { ConsentError } from '../data/consent';
import { linkManagementError, reasonLabel, statusLabel } from '../data/link-management';
import { LinkManagementApiService, LinkStatus, ManagedLink } from '../data/link-management-api.service';
import { ReactivateLinkDialogComponent, ReactivateLinkDialogData } from '../ui/reactivate-link-dialog.component';
import { RevokeLinkDialogComponent, RevokeLinkDialogData } from '../ui/revoke-link-dialog.component';

/** Ordre de la liste principale : actives, puis suspendues, puis en attente ; les révoquées vont à l'historique. */
const CURRENT_ORDER: Partial<Record<LinkStatus, number>> = { ACTIVE: 0, SUSPENDED: 1, PENDING: 2 };

/**
 * Paramètres → Boutique en ligne (lot 2, GA2 ; G10, G4a, v14-D10) : boutiques liées à l'entreprise, avec
 * suspension (confirmation), réactivation (reconfirmation des dépôts, la personne devient responsable) et
 * révocation (confirmation renforcée, irréversible). Une seule action à la fois ; liste relue après chaque action,
 * réussie ou refusée. Erreurs affichées dans l'écran, sans bandeau global (`SILENT_API_ERROR`).
 */
@Component({
  selector: 'app-online-shop-links-page',
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './online-shop-links-page.component.html',
  styleUrl: './online-shop-links-page.component.scss'
})
export class OnlineShopLinksPageComponent implements OnInit {
  private readonly api = inject(LinkManagementApiService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly links = signal<ManagedLink[]>([]);
  readonly busy = signal(false);
  readonly error = signal<ConsentError | null>(null);

  readonly current = computed(() =>
    this.links()
      .filter((link) => link.status !== 'REVOKED')
      .map((link, index) => ({ link, index }))
      .sort((a, b) => (CURRENT_ORDER[a.link.status] ?? 9) - (CURRENT_ORDER[b.link.status] ?? 9) || a.index - b.index)
      .map(({ link }) => link)
  );
  readonly history = computed(() => this.links().filter((link) => link.status === 'REVOKED'));

  readonly statusLabel = statusLabel;
  readonly reasonLabel = reasonLabel;

  ngOnInit(): void {
    this.load();
  }

  warehouseNames(link: ManagedLink): string {
    return link.warehouses.map((w) => (w.active ? w.name : `${w.name} (désactivé)`)).join(', ');
  }

  async suspend(link: ManagedLink): Promise<void> {
    if (!this.start()) return;
    const confirmed = await confirmWith(this.dialog, {
      title: 'Suspendre la liaison ?',
      message:
        `${link.shopName} cesse de se synchroniser avec GestStock jusqu’à la réactivation : catalogue, stock et ` +
        'commandes ne sont plus échangés. La liaison est conservée ; vous pourrez la réactiver.',
      confirmLabel: 'Suspendre'
    });
    if (!confirmed) {
      this.busy.set(false);
      return;
    }
    this.api.suspend(link.id).subscribe({ next: () => this.load(), error: (err: unknown) => this.failed(err) });
  }

  reactivate(link: ManagedLink): void {
    if (!this.start()) return;
    this.api.accessibleWarehouses().subscribe({
      next: (candidates) => {
        const data: ReactivateLinkDialogData = { shopName: link.shopName, candidates, current: link.warehouses };
        this.dialog
          .open<ReactivateLinkDialogComponent, ReactivateLinkDialogData, string[] | undefined>(ReactivateLinkDialogComponent, {
            data,
            maxWidth: '560px',
            width: '100%'
          })
          .afterClosed()
          .subscribe((warehouseIds) => {
            if (!warehouseIds || warehouseIds.length === 0) {
              this.busy.set(false);
              return;
            }
            this.api
              .reactivate(link.id, warehouseIds)
              .subscribe({ next: () => this.load(), error: (err: unknown) => this.failed(err) });
          });
      },
      error: (err: unknown) => {
        this.error.set(linkManagementError(err));
        this.busy.set(false);
      }
    });
  }

  revoke(link: ManagedLink): void {
    if (!this.start()) return;
    this.dialog
      .open<RevokeLinkDialogComponent, RevokeLinkDialogData, boolean>(RevokeLinkDialogComponent, {
        data: { shopName: link.shopName }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed !== true) {
          this.busy.set(false);
          return;
        }
        this.api.revoke(link.id).subscribe({ next: () => this.load(), error: (err: unknown) => this.failed(err) });
      });
  }

  /** Une seule action à la fois : actions inactives dès le premier clic (ni deuxième dialogue, ni double envoi). */
  private start(): boolean {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set(null);
    return true;
  }

  /** Action refusée : message dans l'écran, puis liste relue (l'état a pu changer). */
  private failed(err: unknown): void {
    this.error.set(linkManagementError(err));
    this.load();
  }

  private load(): void {
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (links) => {
          this.links.set(links);
          this.loading.set(false);
          this.busy.set(false);
        },
        error: (err: unknown) => {
          this.error.set(linkManagementError(err));
          this.loading.set(false);
          this.busy.set(false);
        }
      });
  }
}
