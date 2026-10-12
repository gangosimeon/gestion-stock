/**
 * Production : front et API servis sur le même domaine, le reverse proxy transmet /api au
 * backend (voir docs/production.md). URL relative : aucune adresse en dur, pas de CORS.
 * Aucun backend simulé : le mock est exclu du bundle (angular.json, fileReplacements).
 */
export const environment = {
  production: true,
  useMocks: false,
  apiUrl: '/api',
  mockedPrefixes: [] as readonly string[],
  mock: {
    networkDelayMs: 0,
    randomJitter: false,
    slowNetworkMode: false,
    errorSimulation: false,
    errorRate: 0,
    defaultPageSize: 20
  }
};
