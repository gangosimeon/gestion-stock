/**
 * index.ts — Barrel export du système de mocks.
 *
 * Usage recommandé :
 *   import { patchMockConfig, applyQuery, signMockJwt } from '@core/mocks';
 *
 * Switch mock ↔ API réelle :
 *   environment.useMocks = false  (environment.prod.ts)
 *   — ou —
 *   patchMockConfig({ enabled: false })  (runtime, sans rebuild)
 */

// ─── Configuration ────────────────────────────────────────────────────────────
export {
  mockConfig,
  isMockEnabled,
  isSlowNetwork,
  isErrorSimActive,
  patchMockConfig,
  resetMockConfig,
  enableSlowNetwork,
  enableErrorSimulation,
  computeDelayMs,
  shouldInjectError,
  randomErrorStatus,
} from './config/mock.config';
export type { MockConfig, MockNetworkConfig, MockErrorConfig } from './config/mock.config';

// ─── Moteur de requêtes ───────────────────────────────────────────────────────
export {
  applyQuery,
  filterByDateRange,
} from './engine/query.engine';
export type { PagedResult, QueryOptions, RangeFilter } from './engine/query.engine';

// ─── Simulation réseau ────────────────────────────────────────────────────────
export {
  withDelay,
  withNetworkSim,
  mockOk,
  mockErr,
  mockErrDetail,
  mockTimeout,
} from './engine/network.sim';

// ─── JWT simulé ───────────────────────────────────────────────────────────────
export {
  signMockJwt,
  verifyMockJwt,
  extractUsernameFromToken,
  extractUidFromToken,
  isRefreshToken,
} from './engine/jwt.sim';
export type { MockJwtPayload, MockTokenPair } from './engine/jwt.sim';

// ─── Base de données mock ─────────────────────────────────────────────────────
export {
  MOCK_USERS,
  MOCK_WAREHOUSES,
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_SUPPLIERS,
  MOCK_CUSTOMERS,
  MOCK_SALES,
  MOCK_PURCHASE_ORDERS,
  MOCK_STOCK_MOVEMENTS,
  MOCK_EXPENSES,
  MOCK_APPOINTMENTS,
  MOCK_WAREHOUSE_STOCKS,
  MOCK_SUPPLIER_PAYMENTS,
  MOCK_CUSTOMER_PAYMENTS,
  MOCK_SUPPLIER_PURCHASES,
} from './mock-db';

// ─── Factories ────────────────────────────────────────────────────────────────
export { MockFactory } from './mock-factory';
