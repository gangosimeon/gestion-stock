import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/services/auth.service';
import { confirmWith } from '../../../shared/dialog/confirm-dialog.component';
import { ConsentError, SHOP_REDIRECT, consentError, isSafeShopRedirect, scopeLabel } from '../data/consent';
import { AuthorizationRequest, IntegrationLinksApiService, LinkWarehouseChoice } from '../data/integration-links-api.service';
import { LinkWarehousePickerComponent } from '../ui/link-warehouse-picker.component';

/** Permission exigée pour autoriser ou refuser une boutique (backend : `integration:manage`). */
const INTEGRATION_MANAGE = 'integration:manage';

/** Paramètre du lien envoyé par la boutique ; longueur bornée comme côté serveur. */
const REQUEST_URI_PARAM = 'request_uri';
const REQUEST_URI_MAX = 200;

type View = 'loading' | 'forbidden' | 'missing' | 'ready' | 'error' | 'leaving';

/**
 * Écran de consentement d'une liaison boutique (lot 2, GA1 ; v14-D1 étapes 2 et 3) :
 * `/integrations/jecreemaboutique/authorize?request_uri=…`. La personne connectée voit la boutique et
 * l'application qui demandent l'accès, ce que l'accès permet, la devise et le temps restant ; elle choisit les
 * dépôts vendables, puis autorise ou refuse (confirmation explicite), et le navigateur suit l'URL de retour
 * renvoyée par le serveur, et seulement elle.
 *
 * Le `request_uri` est lu une fois, gardé en mémoire (jamais dans le gabarit, jamais journalisé), puis retiré de
 * l'URL (`replaceUrl` : `history.replaceState`) ; il ne part que dans le corps des trois appels de consentement.
 * `Referrer-Policy: no-referrer` pendant l'écran (balise meta, en plus de l'en-tête de nginx).
 */
@Component({
  selector: 'app-authorize-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, LinkWarehousePickerComponent],
  templateUrl: './authorize-page.component.html',
  styleUrl: './authorize-page.component.scss'
})
export class AuthorizePageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(IntegrationLinksApiService);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);
  private readonly openShop = inject(SHOP_REDIRECT);
  private readonly destroyRef = inject(DestroyRef);

  /** En mémoire seulement : jamais exposé au gabarit, jamais journalisé. */
  private requestUri: string | null = null;
  private referrerMeta: HTMLMetaElement | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly now = signal(Date.now());

  readonly view = signal<View>('loading');
  readonly request = signal<AuthorizationRequest | null>(null);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  /** Erreur bloquante (vue `error`) ou erreur d'une action à corriger (vue `ready`). */
  readonly error = signal<ConsentError | null>(null);

  readonly scopes = computed(() => (this.request()?.scopes ?? []).map(scopeLabel));
  readonly expired = computed(() => {
    const request = this.request();
    return request !== null && Date.parse(request.expiresAt) - this.now() <= 0;
  });
  readonly remaining = computed(() => {
    const request = this.request();
    const seconds = request ? Math.max(0, Math.floor((Date.parse(request.expiresAt) - this.now()) / 1000)) : 0;
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, '0');
    return minutes > 0 ? `${minutes} min ${rest} s` : `${seconds % 60} s`;
  });
  readonly canDeny = computed(() => this.view() === 'ready' && !this.expired() && !this.busy());
  readonly canApprove = computed(() => this.canDeny() && this.selected().size > 0);

  ngOnInit(): void {
    this.addReferrerPolicy();
    const uri = this.route.snapshot.queryParamMap.get(REQUEST_URI_PARAM);
    this.requestUri = uri && uri.length <= REQUEST_URI_MAX ? uri : null;
    if (uri !== null) {
      // URL nettoyée sans nouvelle entrée d'historique : le request_uri ne reste ni dans la barre d'adresse, ni
      // dans l'historique, ni dans un Referer.
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
    this.auth
      .ensureCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (!user || !this.auth.hasPermission(INTEGRATION_MANAGE)) {
          this.view.set('forbidden');
        } else if (!this.requestUri) {
          this.view.set('missing');
        } else {
          this.load(this.requestUri);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.referrerMeta?.remove();
  }

  toggle(warehouse: LinkWarehouseChoice, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(warehouse.id);
    else next.delete(warehouse.id);
    this.selected.set(next);
    this.error.set(null);
  }

  async approve(): Promise<void> {
    const request = this.request();
    const uri = this.requestUri;
    if (!this.canApprove() || !request || !uri) return;
    // Bouton inactif dès le premier clic : ni deuxième confirmation, ni double envoi.
    this.busy.set(true);
    this.error.set(null);
    const warehouseIds = request.warehouses.filter((w) => this.selected().has(w.id)).map((w) => w.id);
    const confirmed = await confirmWith(this.dialog, {
      title: 'Autoriser cette boutique ?',
      message:
        `${request.shopName} pourra accéder à votre entreprise par ${request.clientName}, ` +
        `pour ${warehouseIds.length} dépôt${warehouseIds.length > 1 ? 's' : ''}. ` +
        'Vous pourrez suspendre ou révoquer cet accès à tout moment.',
      confirmLabel: 'Autoriser'
    });
    if (!confirmed) {
      this.busy.set(false);
      return;
    }
    this.api.approve(uri, request.scopes, warehouseIds).subscribe({
      next: (response) => this.leave(response.redirectUrl),
      error: (err: unknown) => this.actionFailed(err)
    });
  }

  async deny(): Promise<void> {
    const request = this.request();
    const uri = this.requestUri;
    if (!this.canDeny() || !request || !uri) return;
    this.busy.set(true);
    this.error.set(null);
    const confirmed = await confirmWith(this.dialog, {
      title: 'Refuser cette demande ?',
      message: `${request.shopName} n’aura aucun accès à votre entreprise. Vous retournerez sur la boutique.`,
      confirmLabel: 'Refuser'
    });
    if (!confirmed) {
      this.busy.set(false);
      return;
    }
    this.api.deny(uri).subscribe({
      next: (response) => this.leave(response.redirectUrl),
      error: (err: unknown) => this.actionFailed(err)
    });
  }

  private load(uri: string): void {
    this.api
      .lookup(uri)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (request) => {
          this.request.set(request);
          // Magasins cochés par défaut ; entrepôts à cocher seulement si la boutique expédie depuis eux.
          this.selected.set(new Set(request.warehouses.filter((w) => w.active && w.type === 'STORE').map((w) => w.id)));
          this.view.set('ready');
          this.timer = setInterval(() => this.now.set(Date.now()), 1000);
        },
        error: (err: unknown) => {
          this.error.set(consentError(err));
          this.view.set('error');
        }
      });
  }

  /** Seule navigation hors de GestStock : l'URL du serveur, vérifiée (https, ou localhost en développement). */
  private leave(url: unknown): void {
    if (typeof url !== 'string' || !isSafeShopRedirect(url, !environment.production)) {
      this.error.set({
        message: 'L’adresse de retour vers la boutique est invalide : GestStock ne vous y envoie pas.',
        action: 'Recommencez depuis votre boutique, ou contactez le support GestStock.',
        retryable: false
      });
      this.view.set('error');
      return;
    }
    this.view.set('leaving');
    this.openShop(url);
  }

  private actionFailed(err: unknown): void {
    const error = consentError(err);
    this.error.set(error);
    this.busy.set(false);
    if (!error.retryable) this.view.set('error');
  }

  private addReferrerPolicy(): void {
    const meta = this.document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    this.document.head.appendChild(meta);
    this.referrerMeta = meta;
  }
}
