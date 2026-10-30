import { DEFAULT_RETURN_URL, safeReturnUrl } from './return-url';

/** URL de retour après la connexion (GA1, v14-D15) : chemins internes seulement, sinon le tableau de bord. */
describe('safeReturnUrl', () => {
  it.each([
    '/dashboard',
    '/products',
    '/sales/new?tab=2#paiement',
    '/integrations/jecreemaboutique/authorize?request_uri=urn%3Aietf%3Aparams%3Aoauth%3Arequest_uri%3AZx9',
    '/clients?q=a%20b'
  ])('chemin interne accepté : %s', (url) => {
    expect(safeReturnUrl(url)).toBe(url);
  });

  it.each([
    ['absente', null],
    ['vide', ''],
    ['autre type', 42],
    ['URL absolue https', 'https://evil.example/x'],
    ['URL absolue http', 'http://evil.example'],
    ['sans barre initiale', 'dashboard'],
    ['protocole relatif', '//evil.example/x'],
    ['triple barre', '///evil.example'],
    ['barre et barre inverse', '/\\evil.example'],
    ['barres inverses', '\\\\evil.example'],
    ['barre inverse plus loin', '/a\\b'],
    ['javascript:', 'javascript:alert(1)'],
    ['JaVaScRiPt: en casse mélangée', 'JaVaScRiPt:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['javascript: dans le chemin', '/javascript:alert(1)'],
    ['tabulation (retirée par le navigateur : //hôte)', '/\t/evil.example'],
    ['saut de ligne', '/\n/evil.example'],
    ['espace initial', ' /dashboard'],
    ['// encodé', '/%2F%2Fevil.example'],
    ['// encodé sans barre initiale', '%2F%2Fevil.example'],
    ['barre inverse encodée', '/%5Cevil.example'],
    ['double encodage', '/%252F%252Fevil.example'],
    ['javascript: encodé', '/%6Aavascript%3Aalert(1)'],
    ['tabulation encodée', '/%09/evil.example'],
    ['encodage invalide', '/%E0%A4%A'],
    ['boucle vers la connexion', '/login?returnUrl=%2Fdashboard'],
    ['trop longue', '/' + 'a'.repeat(2100)]
  ])('refusée (%s) : repli sur le tableau de bord', (_label, url) => {
    expect(safeReturnUrl(url)).toBe(DEFAULT_RETURN_URL);
  });
});
