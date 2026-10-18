import { cashTender, quickCashAmounts } from './sales-vm.model';

describe('Encaissement en espèces (montant reçu, monnaie à rendre)', () => {
  it('monnaie à rendre = montant reçu − montant à payer', () => {
    expect(cashTender(10000, 7300)).toEqual({ received: 10000, due: 7300, change: 2700, missing: 0 });
    expect(cashTender(7300, 7300)).toEqual({ received: 7300, due: 7300, change: 0, missing: 0 });
  });

  it('montant insuffisant : somme manquante, aucune monnaie', () => {
    expect(cashTender(5000, 7300)).toEqual({ received: 5000, due: 7300, change: 0, missing: 2300 });
  });

  it('rien de saisi ou saisie invalide : pas de calcul', () => {
    expect(cashTender(null, 7300)).toBeNull();
    expect(cashTender(undefined, 7300)).toBeNull();
    expect(cashTender(-10, 7300)).toBeNull();
    expect(cashTender(Number.NaN, 7300)).toBeNull();
  });

  it('montants proposés : compte juste puis montants ronds supérieurs', () => {
    expect(quickCashAmounts(7300)).toEqual([7300, 7500, 8000, 10000, 20000]);
    expect(quickCashAmounts(10000)).toEqual([10000, 20000, 50000]);
    expect(quickCashAmounts(0)).toEqual([]);
  });
});
