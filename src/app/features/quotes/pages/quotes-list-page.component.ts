import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { Subject, firstValueFrom, merge } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import { toMessage } from '../../../core/interceptors/api-error.interceptor';
import { Quote, QuoteDisplayStatus, isQuoteEditable, quoteStatusLabels } from '../../../core/models/quote.model';
import { QuotesApiService } from '../../../core/services/quotes-api.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { HttpErrorResponse } from '@angular/common/http';

/** Classe de pastille par statut affiché. */
export const quoteBadge: Record<QuoteDisplayStatus, string> = {
  DRAFT: 'badge--neutral',
  ISSUED: 'badge--info',
  ACCEPTED: 'badge--success',
  REFUSED: 'badge--danger',
  EXPIRED: 'badge--warning',
  INVOICED: 'badge--success',
  CANCELLED: 'badge--danger'
};

/**
 * Devis du dépôt courant (ou de tous les dépôts avec warehouse:all) : recherche (n°, client,
 * objet), statut, période, tri et pagination traités par le backend.
 */
@Component({
  selector: 'app-quotes-list-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    DatePickerDirective,
    FilterResetComponent
  ],
  templateUrl: './quotes-list-page.component.html',
  styleUrl: './quotes-list-page.component.scss'
})
export class QuotesListPageComponent {
  private readonly api = inject(QuotesApiService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly reload$ = new Subject<void>();

  /** Interface seulement : le serveur contrôle chaque droit. */
  readonly canManage = this.auth.hasPermission('quote:manage');
  readonly canSeeAllWarehouses = this.auth.hasPermission('warehouse:all');

  readonly statusLabels = quoteStatusLabels;
  readonly badge = quoteBadge;
  readonly isEditable = isQuoteEditable;
  readonly statusOptions = (Object.keys(quoteStatusLabels) as QuoteDisplayStatus[]).map((value) => ({
    value,
    label: quoteStatusLabels[value]
  }));
  readonly displayedColumns = ['number', 'quoteDate', 'customer', 'subject', 'total', 'status', 'actions'] as const;

  readonly table = new ServerTable((query) => this.api.page(query, query.filters), {
    reload$: merge(inject(WarehouseContextService).warehouseChanged$, this.reload$),
    filters: new FormGroup({
      status: new FormControl<QuoteDisplayStatus | null>(null),
      from: new FormControl<string | null>(null),
      to: new FormControl<string | null>(null),
      allWarehouses: new FormControl<boolean>(false, { nonNullable: true })
    }),
    sortFields: { number: 'number', quoteDate: 'quoteDate', customer: 'customerName', total: 'total' }
  });

  badgeOf(quote: Quote): string {
    return quoteBadge[quote.displayStatus];
  }

  statusLabelOf(quote: Quote): string {
    return quoteStatusLabels[quote.displayStatus];
  }

  /** Copie en brouillon, puis ouverture de la copie. */
  async duplicate(quote: Quote): Promise<void> {
    try {
      const copy = await firstValueFrom(this.api.duplicate(quote.id));
      this.snackbar.open(`Devis ${copy.number} créé (copie de ${quote.number}).`, 'OK', { duration: 3500 });
      void this.router.navigate(['/quotes', copy.id, 'edit']);
    } catch (e) {
      this.snackbar.open(e instanceof HttpErrorResponse ? toMessage(e) : 'Duplication impossible.', 'OK', { duration: 4000 });
    }
  }
}
