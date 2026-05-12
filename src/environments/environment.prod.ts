export const environment = {
  production: true,
  useMocks: false,
  apiUrl: 'https://api.example.com/api',
  mock: {
    networkDelayMs: 0,
    randomJitter: false,
    slowNetworkMode: false,
    errorSimulation: false,
    errorRate: 0,
    defaultPageSize: 20
  }
};
