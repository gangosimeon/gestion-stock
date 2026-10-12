export const environment = {
  production: false,
  useMocks: true,
  // Backend Spring Boot local. Les routes encore simulées sont listées dans mockedPrefixes.
  apiUrl: 'http://localhost:8080/api',
  /**
   * Préfixes d'URL encore servis par le backend simulé (migration progressive, voir
   * docs/migration-api.md). Une requête hors de cette liste part vers apiUrl.
   * Migrés vers Spring Boot : /api/auth, /api/users, /api/warehouses, /api/stock, /api/suppliers,
   * /api/purchases, /api/customers, /api/sales, /api/cash-register, /api/inventory, /api/reports,
   * /api/dashboard, /api/products, /api/categories, /api/audit-logs, /api/expenses, /api/appointments.
   */
  mockedPrefixes: [] as readonly string[],
  mock: {
    networkDelayMs: 250,
    randomJitter: true,
    slowNetworkMode: false,
    errorSimulation: false,
    errorRate: 0.05,
    defaultPageSize: 20
  }
};
