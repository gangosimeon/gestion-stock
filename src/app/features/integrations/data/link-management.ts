import { HttpErrorResponse } from '@angular/common/http';

import { ConsentError } from './consent';
import { ManagedLink } from './link-management-api.service';

const STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspendue',
  REVOKED: 'Révoquée',
  PENDING: 'En attente'
};

/** Motifs de suspension (v14-D10), en clair. */
const SUSPENSION_REASONS: Readonly<Record<string, string>> = {
  MANUAL: 'Suspendue par un administrateur de votre entreprise',
  AUTHORIZER_LOST_ACCESS: 'La personne qui l’avait autorisée n’a plus les droits nécessaires'
};

/** Motifs de révocation (contrat `Link.revocationReason`), en clair. */
const REVOCATION_REASONS: Readonly<Record<string, string>> = {
  SHOP_REQUEST: 'Déconnectée depuis la boutique',
  GESTSTOCK_ADMIN: 'Révoquée par un administrateur de votre entreprise',
  CODE_REPLAYED: 'Révoquée automatiquement : le code de connexion a été réutilisé',
  EXPIRED: 'La demande de connexion n’a pas été finalisée à temps'
};

/** Statut d'une liaison, en clair ; jamais le code technique. */
export function statusLabel(link: ManagedLink): string {
  return STATUS_LABELS[link.status] ?? 'Statut inconnu';
}

/** Motif d'une suspension ou d'une révocation, en clair ; `null` pour une liaison active ou en attente. */
export function reasonLabel(link: ManagedLink): string | null {
  if (link.status === 'SUSPENDED' && link.suspensionReason) {
    return SUSPENSION_REASONS[link.suspensionReason] ?? 'Motif non précisé';
  }
  if (link.status === 'REVOKED' && link.revocationReason) {
    return REVOCATION_REASONS[link.revocationReason] ?? 'Motif non précisé';
  }
  return null;
}

const ERRORS: Readonly<Record<string, ConsentError>> = {
  LINK_TRANSITION_INVALID: {
    message: 'Cette liaison a changé entre-temps : l’action n’est plus possible dans son état actuel.',
    action: 'La liste a été mise à jour ; vérifiez son statut avant de réessayer.',
    retryable: false
  },
  LINK_NOT_FOUND: {
    message: 'Cette liaison est introuvable.',
    action: 'La liste a été mise à jour.',
    retryable: false
  }
};

const WAREHOUSE_ERROR: ConsentError = {
  message: 'Un des dépôts choisis n’est plus accessible ou a été désactivé.',
  action: 'Réactivez de nouveau en choisissant d’autres dépôts.',
  retryable: true
};

/** Message d'une erreur de la gestion des liaisons, selon son code (`ApiError.code`) ou, à défaut, son statut. */
export function linkManagementError(err: unknown): ConsentError {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  const body = err instanceof HttpErrorResponse ? (err.error as { code?: unknown } | null) : null;
  const code = typeof body?.code === 'string' ? body.code : null;
  if (code && ERRORS[code]) return ERRORS[code];
  if (code === 'UNKNOWN_WAREHOUSE' || code === 'WAREHOUSE_ACCESS_DENIED' || code === 'WAREHOUSE_INACTIVE') {
    return WAREHOUSE_ERROR;
  }
  if (status === 401) {
    return { message: 'Votre session a expiré.', action: 'Reconnectez-vous, puis recommencez.', retryable: false };
  }
  if (status === 403) {
    return {
      message: 'Seul un administrateur peut gérer les boutiques liées.',
      action: 'Demandez à un administrateur de votre entreprise.',
      retryable: false
    };
  }
  if (status === 0) {
    return { message: 'Serveur injoignable.', action: 'Vérifiez votre connexion, puis réessayez.', retryable: true };
  }
  return { message: 'Une erreur est survenue.', action: 'Réessayez dans quelques instants.', retryable: true };
}
