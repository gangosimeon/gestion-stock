/**
 * mock.config.ts
 * Configuration centralisée du système de mocks.
 * Utilise Angular signals pour permettre la modification à chaud (hot-reload).
 *
 * Switch mock ↔ API réelle : environment.useMocks = false
 * Activation slow-network : patchMockConfig({ slowNetworkMode: true })
 */

import { computed, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface MockNetworkConfig {
  /** Délai de base (ms) pour chaque réponse */
  baseDelayMs: number;
  /** Ajoute une variation aléatoire entre 0 et baseDelayMs * 0.4 */
  randomJitter: boolean;
  /** Multiplie le délai × 8 pour simuler un réseau lent (2G/3G) */
  slowNetworkMode: boolean;
}

export interface MockErrorConfig {
  /** Active l'injection aléatoire d'erreurs sur les succès */
  enabled: boolean;
  /** Probabilité d'erreur par requête (0.0 → 1.0) */
  rate: number;
  /** Codes HTTP injectés aléatoirement */
  statusCodes: number[];
}

export interface MockConfig {
  /** Activer ou non l'ensemble du système de mock */
  enabled: boolean;
  /** Configuration réseau */
  network: MockNetworkConfig;
  /** Configuration d'injection d'erreurs */
  errors: MockErrorConfig;
  /** Afficher un badge visuel dans la UI indiquant que les mocks sont actifs */
  showBadge: boolean;
  /** Taille de page par défaut pour les listes paginées */
  defaultPageSize: number;
}

// ─── Valeur par défaut (provient de environment) ──────────────────────────────

const DEFAULT_CONFIG: MockConfig = {
  enabled: environment.useMocks,
  network: {
    baseDelayMs: environment.mock?.networkDelayMs ?? 250,
    randomJitter: true,
    slowNetworkMode: false,
  },
  errors: {
    enabled: false,
    rate: 0.05,
    statusCodes: [500, 503, 429],
  },
  showBadge: environment.useMocks,
  defaultPageSize: 20,
};

// ─── Signal principal ─────────────────────────────────────────────────────────

export const mockConfig = signal<MockConfig>(DEFAULT_CONFIG);

// ─── Computed shortcuts ───────────────────────────────────────────────────────

export const isMockEnabled    = computed(() => mockConfig().enabled);
export const isSlowNetwork    = computed(() => mockConfig().network.slowNetworkMode);
export const isErrorSimActive = computed(() => mockConfig().errors.enabled);

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Mise à jour partielle de la config (shallow merge) */
export function patchMockConfig(patch: Partial<MockConfig>): void {
  mockConfig.update((c) => ({
    ...c,
    ...patch,
    network: { ...c.network, ...(patch.network ?? {}) },
    errors:  { ...c.errors,  ...(patch.errors  ?? {}) },
  }));
}

/** Remet la configuration à son état initial */
export function resetMockConfig(): void {
  mockConfig.set(DEFAULT_CONFIG);
}

/** Active le mode réseau lent (× 8) */
export function enableSlowNetwork(): void {
  patchMockConfig({ network: { slowNetworkMode: true } as MockNetworkConfig });
}

/** Active l'injection aléatoire d'erreurs */
export function enableErrorSimulation(rate = 0.05): void {
  patchMockConfig({ errors: { enabled: true, rate } as MockErrorConfig });
}

// ─── Helpers publics ──────────────────────────────────────────────────────────

/** Calcule le délai effectif selon la config courante */
export function computeDelayMs(): number {
  const { baseDelayMs, randomJitter, slowNetworkMode } = mockConfig().network;
  const base = slowNetworkMode ? baseDelayMs * 8 : baseDelayMs;
  if (!randomJitter) return base;
  return base + Math.floor(Math.random() * base * 0.4);
}

/** Détermine si une erreur doit être injectée pour cette requête */
export function shouldInjectError(): boolean {
  const { enabled, rate } = mockConfig().errors;
  return enabled && Math.random() < rate;
}

/** Choisit un code HTTP d'erreur aléatoire parmi la liste configurée */
export function randomErrorStatus(): number {
  const codes = mockConfig().errors.statusCodes;
  return codes[Math.floor(Math.random() * codes.length)] ?? 500;
}
