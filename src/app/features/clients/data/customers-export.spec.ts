import { of } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { PageRequest } from '../../../core/services/page-params';
import { customersToRows, fetchAllCustomers } from './customers-export';

function customer(i: number): Customer {
  return { id: `c${i}`, name: `Client ${i}`, creditLimit: 0, balance: i };
}

describe('Export Excel des clients', () => {
  it('récupère toutes les pages (pas seulement celle affichée) avec la recherche et le tri courants', async () => {
    const all = Array.from({ length: 450 }, (_, i) => customer(i));
    const requests: PageRequest[] = [];
    const result = await fetchAllCustomers(
      (page) => {
        requests.push(page);
        return of({ items: all.slice(page.page * page.size, (page.page + 1) * page.size), total: all.length });
      },
      'ray',
      ['name,asc']
    );

    expect(result).toHaveLength(450);
    expect(requests.map((r) => r.page)).toEqual([0, 1, 2]);
    expect(requests.every((r) => r.size === 200 && r.q === 'ray' && r.sort?.[0] === 'name,asc')).toBe(true);
  });

  it('une seule requête quand tout tient dans une page, aucune boucle sur une liste vide', async () => {
    let calls = 0;
    const result = await fetchAllCustomers(() => {
      calls++;
      return of({ items: [], total: 0 });
    }, '', []);
    expect(result).toEqual([]);
    expect(calls).toBe(1);
  });

  it('colonnes en français, montants numériques, libellés lisibles', () => {
    const [row] = customersToRows([
      {
        id: '1', code: 'CLI-000001', name: 'Adjoua', type: 'COMPANY', phone: '+225 05', email: null,
        priceCategory: 'WHOLESALE', creditLimit: 400000, balance: 25000, availableCredit: 375000,
        paymentTermsDays: 30, active: false
      }
    ]);
    expect(row).toEqual({
      Code: 'CLI-000001', Nom: 'Adjoua', Type: 'Entreprise', Téléphone: '+225 05', Email: '', Adresse: '',
      Ville: '', Tarif: 'Prix de gros', 'Limite crédit': 400000, Dette: 25000, 'Crédit disponible': 375000,
      'Délai de paiement (j)': 30, Statut: 'Désactivé'
    });
  });
});
