/** Personnalisation d'une entreprise (GET /api/company/branding, /api/public/companies/{code}/branding). */
export interface CompanyBranding {
  companyCode: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarColor: string;
  headerColor: string;
  buttonColor: string;
  linkColor: string;
  themeMode: 'LIGHT' | 'DARK';
  highContrast: boolean;
  /** URL relative à l'API (`/api/public/companies/{code}/logo?v=…`), absente sans logo. */
  logoUrl?: string | null;
  footerText?: string | null;
  companyCanEdit?: boolean;
}

/** Réponse publique (écran de connexion) : `code` / `name` au lieu de `companyCode` / `companyName`. */
export interface PublicBranding extends Omit<CompanyBranding, 'companyCode' | 'companyName' | 'companyCanEdit'> {
  code: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export function fromPublic(b: PublicBranding): CompanyBranding {
  return { ...b, companyCode: b.code, companyName: b.name };
}

/** Couleurs par défaut de GestStock (aperçu, réinitialisation). */
export const DEFAULT_BRANDING_COLORS = {
  primaryColor: '#2563EB',
  secondaryColor: '#7C3AED',
  accentColor: '#16A34A',
  sidebarColor: '#0B1F3A',
  headerColor: '#FFFFFF',
  buttonColor: '#2563EB',
  linkColor: '#2563EB'
} as const;
