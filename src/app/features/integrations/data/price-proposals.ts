import { HttpErrorResponse } from '@angular/common/http';

import { ConsentError } from './consent';

const ERRORS: Readonly<Record<string, ConsentError>> = {
  PRICE_PROPOSAL_NOT_FOUND: {
    message: 'Cette proposition est introuvable.',
    action: 'La liste a été mise à jour.',
    retryable: false
  },
  PRICE_PROPOSAL_NOT_PENDING: {
    message: 'Cette proposition a déjà été traitée.',
    action: 'La liste a été mise à jour.',
    retryable: false
  },
  LINK_PROPOSAL_REVOKED: {
    message: 'La liaison a été révoquée entre-temps.',
    action: 'La liste a été mise à jour.',
    retryable: false
  },
  LINK_NOT_FOUND: {
    message: 'Cette liaison est introuvable.',
    action: 'La liste a été mise à jour.',
    retryable: false
  },
  VALIDATION_FAILED: {
    message: 'Le motif de refus est invalide.',
    action: 'Corrigez le motif, puis réessayez.',
    retryable: true
  },
  INVALID_PARAMETER: {
    message: 'Un paramètre invalide a été transmis au serveur.',
    action: 'Réessayez ou contactez le support.',
    retryable: false
  },
  MALFORMED_REQUEST: {
    message: 'La requête est mal formée.',
    action: 'Réessayez ou contactez le support.',
    retryable: false
  }
};

/** Message d'une erreur des décisions de prix, selon son code ou son statut HTTP. */
export function priceProposalError(err: unknown): ConsentError {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  const body = err instanceof HttpErrorResponse ? (err.error as { code?: unknown } | null) : null;
  const code = typeof body?.code === 'string' ? body.code : null;
  if (code && ERRORS[code]) return ERRORS[code];
  if (status === 401) {
    return { message: 'Votre session a expiré.', action: 'Reconnectez-vous, puis réessayez.', retryable: false };
  }
  if (status === 403) {
    return { message: 'Accès refusé.', action: 'Demandez les droits nécessaires.', retryable: false };
  }
  if (status === 0) {
    return { message: 'Serveur injoignable.', action: 'Vérifiez votre connexion, puis réessayez.', retryable: true };
  }
  return { message: 'Une erreur est survenue.', action: 'Réessayez dans quelques instants.', retryable: true };
}
