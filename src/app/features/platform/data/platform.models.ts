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

/** État du schéma d'une base d'entreprise (mise à jour après un déploiement). */
export type SchemaState = 'UPGRADING' | 'UP_TO_DATE' | 'FAILED';

export const schemaStateLabels: Record<SchemaState, string> = {
  UPGRADING: 'Mise à jour en cours',
  UP_TO_DATE: 'À jour',
  FAILED: 'En échec'
};

export interface SchemaUpgradeEntry {
  companyId: string;
  code: string;
  state: SchemaState;
  /** Migrations en attente détectées lors de la dernière vérification. */
  pending: number;
  /** Migrations appliquées lors de la dernière mise à jour. */
  applied: number;
  /** Cause d'un échec (sans secret). */
  message: string | null;
  updatedAt: string;
}

export interface SchemaUpgradeStatus {
  running: boolean;
  /** Mise à jour automatique en arrière-plan après chaque démarrage (hébergement à démarrage court). */
  automatic: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  companies: SchemaUpgradeEntry[];
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
