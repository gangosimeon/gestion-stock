import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';

/** Message d'erreur de l'écran de consentement : ce qui s'est passé, et la conduite à tenir. */
export interface ConsentError {
  message: string;
  action: string;
  /** Vrai : la personne peut corriger son choix ou réessayer sur le même écran. */
  retryable: boolean;
}

/** Ce que chaque portée permet à la boutique, en clair (contrat d'intégration, schéma `Scope`). */
const SCOPE_LABELS: Readonly<Record<string, string>> = {
  'catalog:read': 'Consulter votre catalogue : produits, prix de vente et photos',
  'catalog:match': 'Associer les produits de la boutique à ceux de votre catalogue',
  'price:propose': 'Proposer des prix de vente, que vous validez avant qu’ils s’appliquent',
  'stock:read': 'Voir les quantités disponibles dans les dépôts choisis',
  'orders:read': 'Consulter les commandes de la boutique transmises à GestStock',
  'orders:write': 'Transmettre les commandes de la boutique et réserver le stock correspondant'
};

/** Libellé compréhensible d'une portée ; jamais le code technique (`catalog:read`). */
export function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? 'Un autre accès, non décrit par cette version de GestStock';
}

const RESTART = 'Recommencez depuis votre boutique.';

const ERRORS: Readonly<Record<string, ConsentError>> = {
  AUTHORIZATION_REQUEST_NOT_FOUND: {
    message: 'Cette demande d’accès est introuvable ou a expiré.',
    action: RESTART,
    retryable: false
  },
  AUTHORIZATION_REQUEST_EXPIRED: {
    message: 'Cette demande d’accès a expiré.',
    action: RESTART,
    retryable: false
  },
  AUTHORIZATION_REQUEST_ALREADY_DECIDED: {
    message: 'Cette demande d’accès a déjà été traitée (autorisée ou refusée).',
    action: 'Si la boutique n’est pas liée, recommencez depuis votre boutique.',
    retryable: false
  },
  SHOP_ALREADY_LINKED: {
    message: 'Cette boutique est déjà liée à une entreprise GestStock.',
    action: 'Révoquez d’abord la liaison existante, puis recommencez depuis votre boutique.',
    retryable: false
  },
  LINK_CURRENCY_UNSUPPORTED: {
    message: 'La devise de votre entreprise n’est pas prise en charge pour une liaison avec une boutique.',
    action: 'Contactez le support GestStock pour faire vérifier la devise de votre entreprise.',
    retryable: false
  },
  LINK_CLIENT_UNAVAILABLE: {
    message: 'L’application qui demande l’accès n’est plus autorisée par GestStock.',
    action: 'Contactez le support GestStock.',
    retryable: false
  },
  LINK_SCOPE_NOT_REQUESTED: {
    message: 'Les accès envoyés ne correspondent pas à ceux demandés par la boutique.',
    action: RESTART,
    retryable: false
  }
};

const WAREHOUSE_ERROR: ConsentError = {
  message: 'Un des dépôts choisis n’est plus accessible ou a été désactivé.',
  action: 'Décochez-le, ou rechargez la page pour revoir la liste des dépôts, puis autorisez à nouveau.',
  retryable: true
};

/**
 * Message d'une erreur des routes de consentement, selon son code (`ApiError.code`) ou, à défaut, son statut.
 * Aucune de ces erreurs ne renvoie vers la boutique.
 */
export function consentError(err: unknown): ConsentError {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  const body = err instanceof HttpErrorResponse ? (err.error as { code?: unknown } | null) : null;
  const code = typeof body?.code === 'string' ? body.code : null;
  if (code && ERRORS[code]) return ERRORS[code];
  if (code === 'UNKNOWN_WAREHOUSE' || code === 'WAREHOUSE_ACCESS_DENIED' || code === 'WAREHOUSE_INACTIVE') {
    return WAREHOUSE_ERROR;
  }
  if (status === 401) {
    return {
      message: 'Votre session a expiré.',
      action: 'Reconnectez-vous, puis recommencez depuis votre boutique.',
      retryable: false
    };
  }
  if (status === 403) {
    return {
      message: 'Seul un administrateur peut autoriser une boutique.',
      action: 'Demandez à un administrateur de votre entreprise d’ouvrir ce lien.',
      retryable: false
    };
  }
  if (status === 0) {
    return {
      message: 'Serveur injoignable.',
      action: 'Vérifiez votre connexion, puis réessayez.',
      retryable: true
    };
  }
  return {
    message: 'Une erreur est survenue.',
    action: 'Réessayez dans quelques instants.',
    retryable: true
  };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * URL de retour vers la boutique renvoyée par le serveur, vérifiée par défense avant de quitter GestStock :
 * absolue en `https`, ou `http://localhost` en développement ; ni identifiants, ni blanc, ni caractère de
 * contrôle. Le serveur ne renvoie que la `redirect_uri` enregistrée : ce contrôle protège d'une réponse altérée.
 */
export function isSafeShopRedirect(url: unknown, allowLocalhost: boolean): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 4096) return false;
  if (/[\s\u0000-\u001F\u007F\\]/.test(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password || !parsed.hostname) return false;
  if (!url.toLowerCase().startsWith(`${parsed.protocol}//`)) return false;
  if (parsed.protocol === 'https:') return true;
  return allowLocalhost && parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname);
}

/** Navigation du navigateur vers la boutique (remplaçable dans les tests). */
export const SHOP_REDIRECT = new InjectionToken<(url: string) => void>('SHOP_REDIRECT', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return (url: string) => document.location.assign(url);
  }
});
