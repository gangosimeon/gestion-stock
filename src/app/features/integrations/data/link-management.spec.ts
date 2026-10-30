import { HttpErrorResponse } from '@angular/common/http';

import { ManagedLink } from './link-management-api.service';
import { linkManagementError, reasonLabel, statusLabel } from './link-management';

function link(overrides: Partial<ManagedLink>): ManagedLink {
  return {
    id: 'l1',
    shopId: 'shop-1',
    shopName: 'Boutique',
    status: 'ACTIVE',
    suspensionReason: null,
    revocationReason: null,
    currency: 'XOF',
    scopes: ['catalog:read'],
    warehouses: [],
    authorizedBy: 'admin',
    createdAt: '2026-10-01T10:00:00Z',
    activatedAt: '2026-10-01T10:05:00Z',
    suspendedAt: null,
    revokedAt: null,
    ...overrides
  };
}

/** Statuts, motifs et erreurs de l'écran « Boutique en ligne » (GA2), en français. */
describe('Gestion des liaisons : libellés', () => {
  it.each([
    ['ACTIVE', 'Active'],
    ['SUSPENDED', 'Suspendue'],
    ['REVOKED', 'Révoquée'],
    ['PENDING', 'En attente']
  ] as const)('statut %s : « %s »', (status, label) => {
    expect(statusLabel(link({ status }))).toBe(label);
  });

  it.each([
    [{ status: 'SUSPENDED', suspensionReason: 'AUTHORIZER_LOST_ACCESS' }, 'La personne qui l’avait autorisée n’a plus les droits nécessaires'],
    [{ status: 'SUSPENDED', suspensionReason: 'MANUAL' }, 'Suspendue par un administrateur de votre entreprise'],
    [{ status: 'REVOKED', revocationReason: 'SHOP_REQUEST' }, 'Déconnectée depuis la boutique'],
    [{ status: 'REVOKED', revocationReason: 'GESTSTOCK_ADMIN' }, 'Révoquée par un administrateur de votre entreprise'],
    [{ status: 'REVOKED', revocationReason: 'CODE_REPLAYED' }, 'Révoquée automatiquement'],
    [{ status: 'REVOKED', revocationReason: 'EXPIRED' }, 'pas été finalisée à temps']
  ] as const)('motif %#', (overrides, expected) => {
    expect(reasonLabel(link(overrides as Partial<ManagedLink>))).toContain(expected);
  });

  it('aucun motif pour une liaison active ; motif inconnu : libellé générique, sans le code', () => {
    expect(reasonLabel(link({ status: 'ACTIVE' }))).toBeNull();
    const unknown = reasonLabel(link({ status: 'SUSPENDED', suspensionReason: 'AUTRE_MOTIF' }));
    expect(unknown).not.toContain('AUTRE_MOTIF');
    expect(unknown).toBeTruthy();
  });

  function error(status: number, code?: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: code ? { code, message: 'serveur' } : null });
  }

  it.each([
    [error(409, 'LINK_TRANSITION_INVALID'), 'a changé', false],
    [error(404, 'LINK_NOT_FOUND'), 'introuvable', false],
    [error(400, 'UNKNOWN_WAREHOUSE'), 'dépôt', true],
    [error(403, 'WAREHOUSE_ACCESS_DENIED'), 'dépôt', true],
    [error(403, 'WAREHOUSE_INACTIVE'), 'dépôt', true],
    [error(401), 'session a expiré', false],
    [error(403), 'Seul un administrateur', false],
    [error(0), 'connexion', true],
    [error(500), 'Réessayez', true]
  ])('erreur %#', (err, expected, retryable) => {
    const result = linkManagementError(err);
    expect(`${result.message} ${result.action}`).toContain(expected);
    expect(result.retryable).toBe(retryable);
  });
});
