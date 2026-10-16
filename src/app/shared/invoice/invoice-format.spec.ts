import { defaultInvoiceSettings } from '../../core/models/invoice-settings.model';
import {
  amountInWords,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoiceMoney,
  integerToFrenchWords
} from './invoice-format';

const NBSP = ' ';

describe('Format des montants de la facture', () => {
  it('séparateur des milliers configurable, sans décimale par défaut', () => {
    expect(formatInvoiceAmount(1250000, { thousandsSeparator: 'SPACE', decimals: 0 })).toBe(`1${NBSP}250${NBSP}000`);
    expect(formatInvoiceAmount(1250000, { thousandsSeparator: 'DOT', decimals: 0 })).toBe('1.250.000');
    expect(formatInvoiceAmount(1250000, { thousandsSeparator: 'COMMA', decimals: 0 })).toBe('1,250,000');
    expect(formatInvoiceAmount(1250000, { thousandsSeparator: 'NONE', decimals: 0 })).toBe('1250000');
    expect(formatInvoiceAmount(999, { thousandsSeparator: 'SPACE', decimals: 0 })).toBe('999');
  });

  it('deux décimales : virgule décimale, ou point si la virgule sépare les milliers', () => {
    expect(formatInvoiceAmount(1234.5, { thousandsSeparator: 'SPACE', decimals: 2 })).toBe(`1${NBSP}234,50`);
    expect(formatInvoiceAmount(1234.5, { thousandsSeparator: 'COMMA', decimals: 2 })).toBe('1,234.50');
  });

  it('montant négatif, nul ou absent', () => {
    expect(formatInvoiceAmount(-2800, { thousandsSeparator: 'SPACE', decimals: 0 })).toBe(`-2${NBSP}800`);
    expect(formatInvoiceAmount(0, { thousandsSeparator: 'SPACE', decimals: 0 })).toBe('0');
    expect(formatInvoiceAmount(null, { thousandsSeparator: 'SPACE', decimals: 0 })).toBe('0');
  });

  it('devise configurée accolée au montant', () => {
    const appearance = { ...defaultInvoiceSettings().appearance, currencyLabel: 'XOF' as const };
    expect(formatInvoiceMoney(75000, appearance)).toBe(`75${NBSP}000${NBSP}XOF`);
  });
});

describe('Format des dates de la facture', () => {
  const date = new Date(2026, 0, 1, 9, 5);

  it('quatre formats proposés', () => {
    expect(formatInvoiceDate(date, 'dd/MM/yyyy')).toBe('01/01/2026');
    expect(formatInvoiceDate(date, 'dd-MM-yyyy')).toBe('01-01-2026');
    expect(formatInvoiceDate(date, 'yyyy-MM-dd')).toBe('2026-01-01');
    expect(formatInvoiceDate(date, 'd MMMM yyyy')).toBe('1er janvier 2026');
    expect(formatInvoiceDate(new Date(2026, 9, 15), 'd MMMM yyyy')).toBe('15 octobre 2026');
  });

  it('date absente ou invalide : rien plutôt qu’une date fausse', () => {
    expect(formatInvoiceDate(null, 'dd/MM/yyyy')).toBe('');
    expect(formatInvoiceDate('pas une date', 'dd/MM/yyyy')).toBe('');
  });
});

describe('Montant en lettres', () => {
  it.each([
    [0, 'zéro'],
    [1, 'un'],
    [17, 'dix-sept'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [72, 'soixante-douze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [100, 'cent'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [1000, 'mille'],
    [2000, 'deux mille'],
    [80000, 'quatre-vingt mille'],
    [200000, 'deux cent mille'],
    [189980, 'cent quatre-vingt-neuf mille neuf cent quatre-vingts'],
    [1000000, 'un million'],
    [2500000, 'deux millions cinq cent mille'],
    [200000000, 'deux cents millions'],
    [1000000000, 'un milliard']
  ])('%i → %s', (value, words) => {
    expect(integerToFrenchWords(value)).toBe(words);
  });

  it('phrase de facture : majuscule initiale, « francs CFA », « de » après million', () => {
    expect(amountInWords(158200)).toBe('Cent cinquante-huit mille deux cents francs CFA');
    expect(amountInWords(1)).toBe('Un franc CFA');
    expect(amountInWords(2000000)).toBe('Deux millions de francs CFA');
    expect(amountInWords(1500.5)).toBe('Mille cinq cents francs CFA et 50 centimes');
  });
});
