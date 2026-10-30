/** Destination par défaut après la connexion, et repli de toute URL de retour refusée. */
export const DEFAULT_RETURN_URL = '/dashboard';

/** Paramètre de l'écran de connexion qui porte l'URL de retour. */
export const RETURN_URL_PARAM = 'returnUrl';

const MAX_LENGTH = 2000;

/** Décodages successifs examinés au plus (double encodage compris) ; au-delà, refus. */
const MAX_DECODINGS = 4;

const BASE = 'https://geststock.invalid';

/**
 * URL de retour sûre après la connexion (v14-D15) : un chemin INTERNE de l'application, sinon
 * {@link DEFAULT_RETURN_URL}. Aucune redirection ouverte : refuse les URL absolues, `//hôte`, `/\hôte`,
 * tout schéma (`javascript:`, `data:`…), les caractères de contrôle et blancs (le navigateur retire une
 * tabulation : `/\t/hôte` devient `//hôte`), ces mêmes formes encodées (une ou plusieurs fois) et l'écran de
 * connexion lui-même (boucle). Seule fonction de validation de l'URL de retour.
 */
export function safeReturnUrl(raw: unknown): string {
  return isInternalPath(raw) ? raw : DEFAULT_RETURN_URL;
}

function isInternalPath(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return false;
  // Forme brute : aucun blanc ni caractère de contrôle (un paramètre légitime les encode).
  if (/[\s\u0000-\u001F\u007F]/.test(raw)) return false;
  let value = raw;
  for (let i = 0; ; i++) {
    if (!looksInternal(value)) return false;
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return false;
    }
    if (decoded === value) break;
    if (i + 1 >= MAX_DECODINGS) return false;
    value = decoded;
  }
  // Dernier filet : résolue contre une origine fictive, l'URL doit rester sur cette origine.
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return false;
  }
  if (url.origin !== BASE) return false;
  return !/^\/login(?:[/?#;]|$)/i.test(url.pathname + url.search);
}

/** Chemin absolu de l'application : une seule barre initiale, aucune barre inverse, aucun schéma. */
function looksInternal(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\')) return false;
  if (/[\u0000-\u001F\u007F]/.test(value)) return false;
  return !/(?:javascript|data|vbscript|file):/i.test(value);
}
