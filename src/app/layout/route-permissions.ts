/**
 * Permissions backend requises par chaque écran (au moins une). Source unique pour les gardes
 * de route (`permissionGuard`) et pour le menu latéral : un onglet n'est affiché que si sa
 * route est accessible, et inversement.
 *
 * Chaque valeur reprend la permission exigée par le backend pour l'appel principal de l'écran
 * (ex. Achats → GET /api/purchases/orders → purchase:read). Le tableau de bord n'en exige
 * aucune : il s'adapte aux droits de l'utilisateur.
 *
 * Confort d'interface uniquement : le backend reste l'autorité et refuse tout appel non
 * autorisé (403).
 */
export const ROUTE_PERMISSIONS = {
  dashboard: [],
  products: ['product:read'],
  categories: ['category:read'],
  stock: ['stock:read'],
  // Vendre (sale:create) ou consulter l'historique (sale:read).
  sales: ['sale:create', 'sale:read'],
  clients: ['customer:read'],
  quotes: ['quote:read'],
  purchases: ['purchase:read'],
  suppliers: ['supplier:read'],
  'cash-register': ['cash:operate', 'cash:read'],
  expenses: ['expense:read'],
  inventory: ['inventory:read'],
  warehouses: ['warehouse:read'],
  reports: ['report:read'],
  appointments: ['appointment:read'],
  'audit-logs': ['audit:read'],
  users: ['user:manage'],
  // Profil et identité visuelle de l'entreprise : administrateur de l'entreprise.
  company: ['company:manage'],
  // Configuration de la facture et informations de l'entreprise : administrateur.
  settings: ['settings:manage']
} as const satisfies Record<string, readonly string[]>;

export type AppSection = keyof typeof ROUTE_PERMISSIONS;
