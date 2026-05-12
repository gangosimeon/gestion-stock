export const environment = {
  production: false,
  useMocks: true,
  apiUrl: 'http://localhost:3000/api',
  mock: {
    networkDelayMs: 250,
    randomJitter: true,
    slowNetworkMode: false,
    errorSimulation: false,
    errorRate: 0.05,
    defaultPageSize: 20
  }
};
