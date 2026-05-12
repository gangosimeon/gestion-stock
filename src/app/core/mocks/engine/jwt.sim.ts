/**
 * jwt.sim.ts
 * Génération et vérification de faux tokens JWT pour les mocks.
 *
 * Format : header.payload.signature (base64url, non signé cryptographiquement)
 * Compatible avec les décodeurs JWT standards (jwt.io, auth libraries).
 *
 * Usage :
 *   const tokens = signMockJwt(user);
 *   const payload = verifyMockJwt(tokens.accessToken);
 */

import { User } from '../../models/user.model';
import { Role } from '../../models/role.model';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockJwtPayload {
  sub: string;     // username
  uid: string;     // user._id
  roles: Role[];
  email?: string;
  fullName: string;
  iat: number;     // issued at (seconds)
  exp: number;     // expiry  (seconds)
  jti: string;     // unique token ID
}

export interface MockTokenPair {
  accessToken: string;
  refreshToken: string;
  /** Durée de validité de l'access token en secondes */
  expiresIn: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL  = 3_600;        // 1 heure
const REFRESH_TOKEN_TTL = 30 * 86_400;  // 30 jours
const JWT_HEADER        = _b64url('{"alg":"HS256","typ":"JWT"}');

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Génère une paire access / refresh token pour l'utilisateur donné.
 */
export function signMockJwt(user: User): MockTokenPair {
  const accessToken  = _buildToken(user, ACCESS_TOKEN_TTL);
  const refreshToken = _buildToken(user, REFRESH_TOKEN_TTL, true);
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
}

/**
 * Décode et valide un token mock.
 * Retourne null si le token est invalide ou expiré.
 */
export function verifyMockJwt(token: string): MockJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(_decodeB64(parts[1])) as MockJwtPayload;
    const now = _nowSeconds();

    if (!payload.exp || payload.exp < now) return null;
    if (!payload.sub || !payload.uid)      return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extrait uniquement le username depuis un token (sans vérification d'expiry).
 * Utile dans le mock interceptor pour récupérer l'utilisateur.
 */
export function extractUsernameFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const p = JSON.parse(_decodeB64(parts[1])) as Partial<MockJwtPayload>;
    return p.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Extrait l'uid (user.id) depuis un token.
 */
export function extractUidFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const p = JSON.parse(_decodeB64(parts[1])) as Partial<MockJwtPayload>;
    return p.uid ?? null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si un token est un refresh token (TTL > 1 jour).
 */
export function isRefreshToken(token: string): boolean {
  const p = verifyMockJwt(token);
  if (!p) return false;
  return (p.exp - p.iat) > 86_400;
}

// ─── Implémentation privée ────────────────────────────────────────────────────

function _buildToken(user: User, ttl: number, isRefresh = false): string {
  const iat = _nowSeconds();
  const payload: MockJwtPayload = {
    sub:      user.username,
    uid:      user.id,
    roles:    user.roles,
    email:    user.email,
    fullName: user.fullName,
    iat,
    exp:      iat + ttl,
    jti:      _jti(user.id, isRefresh),
  };
  const body = _b64url(JSON.stringify(payload));
  // Signature factice mais déterministe (non sécurisée, dev seulement)
  const sig = _b64url(`mock.${user.id}.${payload.exp}`);
  return `${JWT_HEADER}.${body}.${sig}`;
}

function _nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function _jti(uid: string, isRefresh: boolean): string {
  return `${isRefresh ? 'r' : 'a'}_${uid}_${Date.now().toString(36)}`;
}

function _b64url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function _decodeB64(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(
    Array.from(atob(base64))
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
}
