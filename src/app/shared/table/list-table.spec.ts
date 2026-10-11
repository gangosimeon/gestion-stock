import { ListTable } from './list-table';

interface Row {
  code: string;
  label: string;
  amount: number;
}

describe('ListTable (modèle de tableau)', () => {
  const rows: Row[] = [
    { code: 'A1', label: 'Monture noire', amount: 30 },
    { code: 'B2', label: 'Verre progressif', amount: 10 },
    { code: 'C3', label: 'Étui', amount: 20 }
  ];

  it('bind ne recharge la source que si la liste change', () => {
    const table = new ListTable<Row>((r) => `${r.code} ${r.label}`);
    const ds = table.bind(rows);
    expect(ds.data.length).toBe(3);
    ds.data = [];
    table.bind(rows);
    expect(ds.data.length).toBe(0);
    table.bind([...rows]);
    expect(ds.data.length).toBe(3);
  });

  it('filtre sur le texte de la ligne, sans tenir compte de la casse', () => {
    const table = new ListTable<Row>((r) => `${r.code} ${r.label}`);
    table.bind(rows);
    table.dataSource.filter = 'verre';
    expect(table.dataSource.filteredData.map((r) => r.code)).toEqual(['B2']);
    table.dataSource.filter = 'zzz';
    expect(table.isEmpty).toBe(true);
  });

  it('valeur de tri personnalisée, sinon la propriété de même nom', () => {
    const table = new ListTable<Row>((r) => r.label, (r, col) => (col === 'total' ? r.amount : undefined));
    expect(table.dataSource.sortingDataAccessor(rows[0], 'total')).toBe(30);
    expect(table.dataSource.sortingDataAccessor(rows[0], 'code')).toBe('A1');
  });
});
