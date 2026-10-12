import { environment } from '../../../environments/environment';
import { isMockedUrl } from './mock-routing';

describe('isMockedUrl (migration progressive)', () => {
  const prefixes = ['/api/products', '/api/users'];

  it('tous les modules sont migrés : jamais servis par le mock', () => {
    for (const path of [
      '/auth/login', '/auth/me', '/auth/logout', '/auth/refresh', '/users', '/users/42/password',
      '/warehouses', '/warehouses/current', '/warehouses/transfer', '/stock/movements', '/stock/levels',
      '/suppliers', '/suppliers/42/payments', '/purchases/orders', '/purchases/orders/42/invoice',
      '/customers', '/customers/42/payments', '/sales', '/cash-register/current', '/cash-register/open',
      '/inventory/sessions', '/inventory/sessions/42', '/reports/sales/by-period', '/dashboard',
      '/products', '/products/42', '/categories', '/audit-logs', '/audit-logs/stats', '/audit-logs/export',
      '/expenses', '/expenses/summary', '/expenses/42/cancel', '/appointments', '/appointments/42/status'
    ]) {
      expect(isMockedUrl(`${environment.apiUrl}${path}`, environment.mockedPrefixes)).toBe(false);
    }
  });

  it('plus aucun préfixe simulé', () => {
    expect(environment.mockedPrefixes).toEqual([]);
  });

  it('correspondance par segment entier, URL absolue ou relative, query string ignorée', () => {
    expect(isMockedUrl('http://localhost:8080/api/products/42?x=1', prefixes)).toBe(true);
    expect(isMockedUrl('/api/users?page=0', prefixes)).toBe(true);
    expect(isMockedUrl('/api/productsX', prefixes)).toBe(false);
    expect(isMockedUrl('/api/auth/login', prefixes)).toBe(false);
  });
});
