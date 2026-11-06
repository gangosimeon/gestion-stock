import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ConsentError } from '../data/consent';
import { priceProposalError } from '../data/price-proposals';
import { CrossLinkProposalView, PriceProposalsApiService } from '../data/price-proposals-api.service';
import { ServerTable } from '../../../shared/table/server-table';
import { RejectProposalDialogComponent, RejectProposalDialogData, RejectProposalDialogResult } from '../ui/reject-proposal-dialog.component';

/** Groupe de propositions par liaison. */
interface ProposalGroup {
  linkId: string;
  shopName: string;
  linkStatus: string;
  proposals: CrossLinkProposalView[];
}

/**
 * Paramètres → Prix boutique (lot 3, GA3 ; G24) : approbation et refus des propositions de prix des boutiques
 * liées. Source unique : GET /api/price-proposals. Visible uniquement avec `integration:price-approve` (G21).
 */
@Component({
  selector: 'app-price-proposals-page',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatPaginatorModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './price-proposals-page.component.html',
  styleUrl: './price-proposals-page.component.scss'
})
export class PriceProposalsPageComponent {
  private readonly api = inject(PriceProposalsApiService);
  private readonly dialog = inject(MatDialog);

  readonly table = new ServerTable<CrossLinkProposalView>(
    (q) => this.api.listAll(q.page, q.size)
  );

  private readonly state = toSignal(this.table.state$);

  readonly groups = computed<ProposalGroup[]>(() => {
    const rows = this.state()?.rows ?? [];
    const map = new Map<string, ProposalGroup>();
    for (const p of rows) {
      if (!map.has(p.linkId)) {
        map.set(p.linkId, { linkId: p.linkId, shopName: p.shopName, linkStatus: p.linkStatus, proposals: [] });
      }
      map.get(p.linkId)!.proposals.push(p);
    }
    return [...map.values()];
  });

  readonly loading = computed(() => this.state()?.loading ?? true);
  readonly total = computed(() => this.state()?.total ?? 0);
  readonly actionError = signal<ConsentError | null>(null);

  private readonly busySet = signal<ReadonlySet<string>>(new Set());

  isBusy(proposalId: string): boolean {
    return this.busySet().has(proposalId);
  }

  approve(linkId: string, proposal: CrossLinkProposalView): void {
    if (this.isBusy(proposal.proposalId)) return;
    this.setBusy(proposal.proposalId, true);
    this.actionError.set(null);
    this.api.approve(linkId, proposal.proposalId).subscribe({
      next: () => {
        this.setBusy(proposal.proposalId, false);
        this.table.reload();
      },
      error: (err: unknown) => {
        this.setBusy(proposal.proposalId, false);
        this.actionError.set(priceProposalError(err));
        this.table.reload();
      }
    });
  }

  reject(linkId: string, proposal: CrossLinkProposalView): void {
    const data: RejectProposalDialogData = {
      linkId,
      proposalId: proposal.proposalId,
      productName: proposal.productName,
      productSku: proposal.productSku
    };
    this.dialog
      .open<RejectProposalDialogComponent, RejectProposalDialogData, RejectProposalDialogResult>(
        RejectProposalDialogComponent,
        { data, maxWidth: '500px', width: '100%' }
      )
      .afterClosed()
      .subscribe((result) => {
        if (result === undefined) return;
        if (!result.success) {
          this.actionError.set(result.error);
        }
        this.table.reload();
      });
  }

  /** Vrai si le prix de référence GestStock a changé depuis la proposition. */
  referenceChanged(proposal: CrossLinkProposalView): boolean {
    return proposal.currentReferencePrice !== proposal.referencePriceAtProposal;
  }

  private setBusy(proposalId: string, busy: boolean): void {
    this.busySet.update((s) => {
      const next = new Set(s);
      if (busy) next.add(proposalId); else next.delete(proposalId);
      return next;
    });
  }
}
