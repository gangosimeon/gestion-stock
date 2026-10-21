import { CompanyBranding } from '../../../core/branding/branding.model';

export type CompanyStatus = 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'SUSPENDED';

export type CompanyPlan = 'ESSENTIEL' | 'STANDARD' | 'PREMIUM' | 'ENTREPRISE';

export const companyStatusLabels: Record<CompanyStatus, string> = {
  PENDING: 'En attente',
  PROVISIONING: 'Création en cours',
  ACTIVE: 'Active',
  FAILED: 'Échec de création',
  SUSPENDED: 'Suspendue'
};

export const planLabels: Record<CompanyPlan, string> = {
  ESSENTIEL: 'Essentiel',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  ENTREPRISE: 'Entreprise'
};

export const provisioningStepLabels: Record<string, string> = {
  DATABASE_RECORD: 'Enregistrement de la base',
  ROLE: 'Rôle PostgreSQL',
  DATABASE: 'Création de la base',
  MIGRATIONS: 'Schéma (migrations)',
  COMPANY_SETTINGS: 'Coordonnées sur les documents',
  ADMIN_ACCOUNT: 'Compte administrateur',
  ACTIVATION: 'Activation',
  INIT: 'Initialisation'
};

export interface CompanyListItem {
  id: string;
  number: number;
  code: string;
  legalName: string;
  tradeName: string;
  city?: string | null;
  plan: CompanyPlan;
  status: CompanyStatus;
  subscriptionEndsOn?: string | null;
  createdAt: string;
}

export interface ProvisioningStep {
  step: string;
  status: 'DONE' | 'SKIPPED' | 'FAILED';
  message?: string | null;
  attempt: number;
  occurredAt: string;
}

export interface Company {
  id: string;
  number: number;
  code: string;
  legalName: string;
  tradeName: string;
  sector?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  currency: string;
  ownerFirstName?: string | null;
  ownerLastName: string;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  adminUsername: string;
  plan: CompanyPlan;
  subscriptionStartsOn?: string | null;
  subscriptionEndsOn?: string | null;
  status: CompanyStatus;
  statusReason?: string | null;
  createdAt: string;
  updatedAt: string;
  database?: { name: string; mode: 'LEGACY' | 'DEDICATED' } | null;
  provisioning?: {
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    currentStep?: string | null;
    attempts: number;
    lastError?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    steps: ProvisioningStep[];
  } | null;
}

/** Corps de création (POST /api/platform/companies). */
export interface CompanyRequest {
  code?: string;
  legalName: string;
  tradeName: string;
  sector?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  currency?: string | null;
  ownerFirstName?: string | null;
  ownerLastName: string;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  adminUsername?: string;
  plan?: CompanyPlan | null;
  subscriptionStartsOn?: string | null;
  subscriptionEndsOn?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface ActivationLink {
  companyCode: string;
  username: string;
  token: string;
  expiresAt: string;
}

export interface PlatformStats {
  total: number;
  active: number;
  suspended: number;
  provisioning: number;
  failed: number;
  expiringWithin30Days: number;
  recent: CompanyListItem[];
}

export interface PlatformAuditEntry {
  id: string;
  occurredAt: string;
  actorName?: string | null;
  action: string;
  companyId?: string | null;
  companyCode?: string | null;
  details?: string | null;
}

/** Corps de PUT …/branding (couleurs #RRGGBB, mode, contraste, mentions). */
export type BrandingRequest = Pick<
  CompanyBranding,
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'sidebarColor'
  | 'headerColor'
  | 'buttonColor'
  | 'linkColor'
  | 'themeMode'
  | 'highContrast'
> & { footerText?: string | null };
