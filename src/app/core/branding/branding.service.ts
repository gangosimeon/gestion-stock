import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CompanyBranding, PublicBranding, fromPublic } from './branding.model';

const CACHE_KEY = 'company_branding';
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Variables posées sur <html> (voir styles.scss : jetons --color-* et palette Material). */
const VARIABLES = [
  '--company-primary',
  '--company-primary-hover',
  '--company-primary-light',
  '--company-primary-dark',
  '--company-primary-soft',
  '--company-secondary',
  '--company-secondary-soft',
  '--company-accent',
  '--company-sidebar',
  '--company-sidebar-2',
  '--company-sidebar-text',
  '--company-sidebar-title',
  '--company-header',
  '--company-header-text',
  '--company-button',
  '--company-link'
] as const;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Mélange `hex` avec `other` (0 : hex, 1 : other). */
export function mix(hex: string, other: string, weight: number): string {
  const a = toRgb(hex);
  const b = toRgb(other);
  return toHex({ r: a.r + (b.r - a.r) * weight, g: a.g + (b.g - a.g) * weight, b: a.b + (b.b - a.b) * weight });
}

/** Luminance relative (WCAG) : choix d'un texte lisible sur une couleur de fond. */
export function luminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Couleur sûre : `#RRGGBB` uniquement (jamais de CSS libre), sinon repli. */
function safe(hex: string | null | undefined, fallback: string): string {
  return hex && HEX.test(hex) ? hex.toUpperCase() : fallback;
}

/**
 * Thème de l'entreprise connectée : variables CSS sur <html> (jamais de feuille de style libre), logo,
 * nom, mode clair/sombre, contraste. Mis en cache par code d'entreprise (sessionStorage) pour être
 * appliqué dès le démarrage sans flash ; effacé à la déconnexion et à tout changement d'entreprise.
 *
 * Le thème n'est jamais une preuve d'identité : l'accès est décidé par le backend.
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  private readonly brandingSubject = new BehaviorSubject<CompanyBranding | null>(null);
  readonly branding$ = this.brandingSubject.asObservable();

  get current(): CompanyBranding | null {
    return this.brandingSubject.value;
  }

  /**
   * Démarrage : applique le thème mis en cache, seulement s'il appartient à l'entreprise de la session
   * en cours (un thème d'une autre entreprise n'est jamais réutilisé).
   */
  restore(companyCode: string | null): void {
    const cached = this.readCache();
    if (cached && companyCode && cached.companyCode === companyCode) {
      this.apply(cached);
    } else {
      this.clear();
    }
  }

  /** Thème de l'entreprise connectée (après connexion ou actualisation). */
  load(): Observable<CompanyBranding | null> {
    return this.http.get<CompanyBranding>(`${environment.apiUrl}/company/branding`).pipe(
      tap((b) => {
        this.apply(b);
        this.writeCache(b);
      }),
      catchError(() => of(null))
    );
  }

  /** Marque publique d'une entreprise (écran de connexion) ; `null` si inconnue. */
  loadPublic(code: string): Observable<CompanyBranding | null> {
    return this.http
      .get<PublicBranding>(`${environment.apiUrl}/public/companies/${encodeURIComponent(code)}/branding`)
      .pipe(
        map(fromPublic),
        catchError(() => of(null))
      );
  }

  /** URL absolue d'un logo renvoyé par l'API (chemin relatif `/api/...`). */
  logoSrc(branding: CompanyBranding | null): string | null {
    const url = branding?.logoUrl;
    if (!url || !url.startsWith('/api/')) return null;
    return environment.apiUrl.replace(/\/api$/, '') + url;
  }

  apply(branding: CompanyBranding): void {
    const root = this.document.documentElement;
    const primary = safe(branding.primaryColor, '#2563EB');
    const secondary = safe(branding.secondaryColor, '#7C3AED');
    const sidebar = safe(branding.sidebarColor, '#0B1F3A');
    const header = safe(branding.headerColor, '#FFFFFF');
    const values: Record<(typeof VARIABLES)[number], string> = {
      '--company-primary': primary,
      '--company-primary-hover': mix(primary, '#000000', 0.15),
      '--company-primary-light': mix(primary, '#FFFFFF', 0.35),
      '--company-primary-dark': mix(primary, '#000000', 0.45),
      '--company-primary-soft': mix(primary, '#FFFFFF', 0.92),
      '--company-secondary': secondary,
      '--company-secondary-soft': mix(secondary, '#FFFFFF', 0.92),
      '--company-accent': safe(branding.accentColor, '#16A34A'),
      '--company-sidebar': sidebar,
      '--company-sidebar-2': luminance(sidebar) > 0.4 ? mix(sidebar, '#000000', 0.08) : mix(sidebar, '#FFFFFF', 0.08),
      '--company-sidebar-text': luminance(sidebar) > 0.4 ? '#1F2937' : '#C8D2E0',
      '--company-sidebar-title': luminance(sidebar) > 0.4 ? '#0F172A' : '#FFFFFF',
      '--company-header': header,
      '--company-header-text': luminance(header) > 0.4 ? '#172B4D' : '#FFFFFF',
      '--company-button': safe(branding.buttonColor, primary),
      '--company-link': safe(branding.linkColor, primary)
    };
    for (const name of VARIABLES) root.style.setProperty(name, values[name]);
    root.setAttribute('data-theme', branding.themeMode === 'DARK' ? 'dark' : 'light');
    root.setAttribute('data-contrast', branding.highContrast ? 'high' : 'normal');
    this.setFavicon(this.logoSrc(branding));
    this.brandingSubject.next(branding);
  }

  /** Retour à la charte GestStock : aucune trace de l'entreprise précédente. */
  clear(): void {
    const root = this.document.documentElement;
    for (const name of VARIABLES) root.style.removeProperty(name);
    root.removeAttribute('data-theme');
    root.removeAttribute('data-contrast');
    this.setFavicon(null);
    this.removeCache();
    this.brandingSubject.next(null);
  }

  private setFavicon(src: string | null): void {
    const link = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    if (!link.dataset['default']) link.dataset['default'] = link.getAttribute('href') ?? 'favicon.ico';
    link.href = src ?? link.dataset['default'];
  }

  private readCache(): CompanyBranding | null {
    try {
      const json = sessionStorage.getItem(CACHE_KEY);
      return json ? (JSON.parse(json) as CompanyBranding) : null;
    } catch {
      return null;
    }
  }

  private writeCache(b: CompanyBranding): void {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(b));
    } catch {
      // Stockage indisponible (navigation privée) : le thème sera rechargé depuis l'API.
    }
  }

  private removeCache(): void {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Rien à effacer.
    }
  }
}
