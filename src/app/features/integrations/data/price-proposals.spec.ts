import { HttpErrorResponse } from '@angular/common/http';

import { priceProposalError } from './price-proposals';

/** Messages d'erreur des decisions de prix (lot 3, GA3 — G22b, G24). */
describe('priceProposalError', () => {
  function err(status: number, code?: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: code ? { code, message: 'serveur' } : null });
  }

  it.each([
    [err(404, 'PRICE_PROPOSAL_NOT_FOUND'), 'introuvable'],
    [err(409, 'PRICE_PROPOSAL_NOT_PENDING'), 'traitée'],
    [err(409, 'LINK_PROPOSAL_REVOKED'), 'révoquée'],
    [err(404, 'LINK_NOT_FOUND'), 'introuvable'],
    [err(400, 'VALIDATION_FAILED'), 'motif'],
    [err(400, 'INVALID_PARAMETER'), 'invalide'],
    [err(400, 'MALFORMED_REQUEST'), 'formée'],
    [err(401), 'expiré'],
    [err(403), 'refusé'],
    [err(0), 'connexion'],
    [err(500), 'Réessayez']
  ])('erreur %#: message contient le mot attendu', (error, expected) => {
    const result = priceProposalError(error);
    expect(`${result.message} ${result.action}`).toContain(expected);
  });

  it('PRICE_PROPOSAL_NOT_FOUND et LINK_NOT_FOUND : non réessayable', () => {
    expect(priceProposalError(err(404, 'PRICE_PROPOSAL_NOT_FOUND')).retryable).toBe(false);
    expect(priceProposalError(err(404, 'LINK_NOT_FOUND')).retryable).toBe(false);
  });

  it('PRICE_PROPOSAL_NOT_PENDING et LINK_PROPOSAL_REVOKED : non réessayable', () => {
    expect(priceProposalError(err(409, 'PRICE_PROPOSAL_NOT_PENDING')).retryable).toBe(false);
    expect(priceProposalError(err(409, 'LINK_PROPOSAL_REVOKED')).retryable).toBe(false);
  });

  it('réseau (status 0) : réessayable', () => {
    expect(priceProposalError(err(0)).retryable).toBe(true);
  });

  it('erreur inconnue non HTTP : message générique réessayable', () => {
    const result = priceProposalError(new Error('oops'));
    expect(result.retryable).toBe(true);
  });
});
