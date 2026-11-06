import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { RejectProposalDialogComponent, RejectProposalDialogData } from './reject-proposal-dialog.component';

const BASE = `${environment.apiUrl}/integration-links`;
const DATA: RejectProposalDialogData = {
  linkId: 'link-1',
  proposalId: 'prop-1',
  productName: 'Chaussures cuir',
  productSku: 'CH-001'
};

/** Dialogue de refus (lot 3, GA3). */
describe('RejectProposalDialogComponent', () => {
  let fixture: ComponentFixture<RejectProposalDialogComponent>;
  let http: HttpTestingController;
  let closed: Array<unknown>;

  function setup(data: RejectProposalDialogData = DATA): void {
    closed = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: (v?: unknown) => void closed.push(v) } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RejectProposalDialogComponent);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  function page(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function confirmBtn(): HTMLButtonElement {
    return page().querySelector<HTMLButtonElement>('[data-test="confirm-reject"]')!;
  }

  async function typeReason(reason: string): Promise<void> {
    const textarea = page().querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = reason;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }

  // --- Validation ---

  it('bouton inactif si motif vide ou blancs uniquement', async () => {
    setup();
    expect(confirmBtn().disabled).toBe(true);
    await typeReason('   ');
    expect(confirmBtn().disabled).toBe(true);
  });

  it('1 caractère après strip : valide', async () => {
    setup();
    await typeReason('X');
    expect(confirmBtn().disabled).toBe(false);
  });

  it('exactement 500 caractères (points de code) : valide', async () => {
    setup();
    await typeReason('A'.repeat(500));
    expect(confirmBtn().disabled).toBe(false);
  });

  it('501 caractères : bouton inactif', async () => {
    setup();
    await typeReason('A'.repeat(501));
    expect(confirmBtn().disabled).toBe(true);
  });

  it('500 points de code avec emoji (2 unités UTF-16 = 1 point de code) : valide', async () => {
    setup();
    // 499 lettres + 1 emoji = 500 points de code, mais 500+1 unités UTF-16
    const reason = 'A'.repeat(499) + '\u{1F600}';
    await typeReason(reason);
    expect(confirmBtn().disabled).toBe(false);
  });

  it('501 points de code avec emoji : bouton inactif', async () => {
    setup();
    // 500 lettres + 1 emoji = 501 points de code
    const reason = 'A'.repeat(500) + '\u{1F600}';
    await typeReason(reason);
    expect(confirmBtn().disabled).toBe(true);
  });

  it('caractère de contrôle (NUL, ESC, DEL) : bouton inactif', async () => {
    setup();
    for (const cp of ['\x00', '\x01', '\x0B', '\x1B', '\x7F']) {
      await typeReason('motif' + cp);
      expect(confirmBtn().disabled).toBe(true);
    }
  });

  it('tabulation et saut de ligne : acceptés (même règle que le backend)', async () => {
    setup();
    await typeReason('motif\tavec\ttabulation');
    expect(confirmBtn().disabled).toBe(false);
    await typeReason('motif\navec\nsaut');
    expect(confirmBtn().disabled).toBe(false);
  });

  // --- Envoi ---

  it('envoi : bouton inactif pendant appel (état envoi en cours)', async () => {
    setup();
    await typeReason('Marge insuffisante');
    confirmBtn().click();
    fixture.detectChanges();
    expect(confirmBtn().disabled).toBe(true);
    http.expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`).flush({});
    await settle();
  });

  it('succès : dialogue fermé avec { success: true }', async () => {
    setup();
    await typeReason('Marge insuffisante');
    confirmBtn().click();
    http.expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`).flush({});
    await settle();
    expect(closed).toEqual([{ success: true }]);
  });

  it('raison trimmée transmise au backend', async () => {
    setup();
    await typeReason('  Marge  ');
    confirmBtn().click();
    const req = http.expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`);
    expect(req.request.body).toEqual({ reason: 'Marge' });
    req.flush({});
  });

  // --- Dialogue reste ouvert sur erreur 400 ---

  it('erreur 400 VALIDATION_FAILED : dialogue reste ouvert, message affiché', async () => {
    setup();
    await typeReason('Motif valide');
    confirmBtn().click();
    http
      .expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`)
      .flush({ code: 'VALIDATION_FAILED', message: 'motif invalide' }, { status: 400, statusText: 'Bad Request' });
    await settle();
    expect(closed).toEqual([]);
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('motif');
  });

  it('erreur 409 PRICE_PROPOSAL_NOT_PENDING : dialogue fermé avec { success: false, error }', async () => {
    setup();
    await typeReason('Motif valide');
    confirmBtn().click();
    http
      .expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`)
      .flush({ code: 'PRICE_PROPOSAL_NOT_PENDING', message: '' }, { status: 409, statusText: 'Conflict' });
    await settle();
    expect(closed.length).toBe(1);
    expect((closed[0] as { success: boolean }).success).toBe(false);
    expect((closed[0] as { error: { message: string } }).error.message).toBeTruthy();
  });

  it('erreur 409 LINK_PROPOSAL_REVOKED : dialogue fermé avec { success: false, error }', async () => {
    setup();
    await typeReason('Motif valide');
    confirmBtn().click();
    http
      .expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`)
      .flush({ code: 'LINK_PROPOSAL_REVOKED', message: '' }, { status: 409, statusText: 'Conflict' });
    await settle();
    expect((closed[0] as { success: boolean }).success).toBe(false);
  });

  it('erreur 404 LINK_NOT_FOUND : dialogue fermé avec { success: false, error }', async () => {
    setup();
    await typeReason('Motif valide');
    confirmBtn().click();
    http
      .expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`)
      .flush({ code: 'LINK_NOT_FOUND', message: '' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect((closed[0] as { success: boolean }).success).toBe(false);
  });

  it('erreur réseau : dialogue fermé avec { success: false, error }', async () => {
    setup();
    await typeReason('Motif valide');
    confirmBtn().click();
    http.expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`).error(new ProgressEvent('error'));
    await settle();
    expect((closed[0] as { success: boolean }).success).toBe(false);
  });

  it('après erreur dans le dialogue, champ de motif conservé (pas de reset)', async () => {
    setup();
    await typeReason('Mon motif');
    confirmBtn().click();
    http
      .expectOne(`${BASE}/link-1/price-proposals/prop-1/reject`)
      .flush({ code: 'VALIDATION_FAILED' }, { status: 400, statusText: 'Bad Request' });
    await settle();
    const textarea = page().querySelector<HTMLTextAreaElement>('textarea')!;
    expect(textarea.value).toBe('Mon motif');
  });
});
