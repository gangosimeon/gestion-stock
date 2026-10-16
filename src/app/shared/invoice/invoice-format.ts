import { InvoiceAppearance, InvoiceDateFormat, ThousandsSeparator } from '../../core/models/invoice-settings.model';

const SEPARATORS: Record<ThousandsSeparator, string> = {
  // Espace insécable : un montant n'est jamais coupé en fin de ligne.
  SPACE: ' ',
  DOT: '.',
  COMMA: ',',
  NONE: ''
};

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

type AmountFormat = Pick<InvoiceAppearance, 'thousandsSeparator' | 'decimals'>;

/**
 * Montant affiché selon la configuration (séparateur des milliers, 0 ou 2 décimales). Présentation
 * seulement : la valeur vient de la vente enregistrée, elle n'est jamais recalculée ici.
 */
export function formatInvoiceAmount(value: number | null | undefined, format: AmountFormat): string {
  const amount = Number(value ?? 0);
  const decimals = format.decimals === 2 ? 2 : 0;
  const fixed = Math.abs(amount).toFixed(decimals);
  const [integer, fraction] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATORS[format.thousandsSeparator]);
  const decimalMark = format.thousandsSeparator === 'COMMA' ? '.' : ',';
  const sign = amount < 0 && Number(fixed) !== 0 ? '-' : '';
  return sign + grouped + (fraction ? decimalMark + fraction : '');
}

/** Montant suivi de la devise configurée (« 75 000 FCFA »). */
export function formatInvoiceMoney(value: number | null | undefined, appearance: InvoiceAppearance): string {
  return `${formatInvoiceAmount(value, appearance)} ${appearance.currencyLabel}`;
}

/** Date au format configuré, dans le fuseau du navigateur (comme le reste de l'application). */
export function formatInvoiceDate(value: string | Date | null | undefined, format: InvoiceDateFormat): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = String(date.getFullYear());
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  switch (format) {
    case 'dd-MM-yyyy':
      return `${dd}-${mm}-${y}`;
    case 'yyyy-MM-dd':
      return `${y}-${mm}-${dd}`;
    case 'd MMMM yyyy':
      return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`;
    default:
      return `${dd}/${mm}/${y}`;
  }
}

/** Heure (HH:mm), affichée à côté de la date d'une vente. */
export function formatInvoiceTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// --- Montant en lettres ------------------------------------------------------------------------

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0 à 99, orthographe traditionnelle (« vingt et un », « quatre-vingts », « soixante-dix »). */
function belowHundred(n: number, final: boolean): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? 'soixante' : 'quatre-vingt';
    const rest = 10 + unit;
    return ten === 7 && unit === 1 ? `${base} et onze` : `${base}-${UNITS[rest]}`;
  }
  if (ten === 8) {
    return unit === 0 ? (final ? 'quatre-vingts' : 'quatre-vingt') : `quatre-vingt-${UNITS[unit]}`;
  }
  if (unit === 0) return TENS[ten];
  if (unit === 1) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

/** 0 à 999 ; `final` : le groupe termine le nombre (accord de « cents » et « quatre-vingts »). */
function belowThousand(n: number, final: boolean): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundred > 0) {
    const plural = hundred > 1 && rest === 0 && final;
    parts.push(hundred === 1 ? 'cent' : `${UNITS[hundred]} ${plural ? 'cents' : 'cent'}`);
  }
  if (rest > 0) parts.push(belowHundred(rest, final));
  return parts.join(' ');
}

/** Entier positif en toutes lettres (« cent quatre-vingt-neuf mille neuf cent quatre-vingts »). */
export function integerToFrenchWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'zéro';
  const scales: [number, string, string][] = [
    [1_000_000_000, 'milliard', 'milliards'],
    [1_000_000, 'million', 'millions']
  ];
  const parts: string[] = [];
  for (const [size, singular, plural] of scales) {
    const count = Math.floor(n / size);
    if (count > 0) {
      parts.push(`${belowThousand(count, true)} ${count > 1 ? plural : singular}`);
      n %= size;
    }
  }
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    // « mille » est invariable et ne prend pas « un » devant.
    parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`);
    n %= 1000;
  }
  if (n > 0) parts.push(belowThousand(n, true));
  return parts.join(' ');
}

/**
 * Montant en lettres pour la facture (« Cent quatre-vingt-neuf mille neuf cent quatre-vingts
 * francs CFA »). Les centimes, s'il y en a, sont ajoutés en chiffres.
 */
export function amountInWords(value: number | null | undefined): string {
  const amount = Math.abs(Number(value ?? 0));
  const integer = Math.floor(amount);
  const cents = Math.round((amount - integer) * 100);
  const words = integerToFrenchWords(integer);
  const unit = integer > 1 ? 'francs CFA' : 'franc CFA';
  const text = `${words} ${/(millions?|milliards?)$/.test(words) ? 'de ' : ''}${unit}`;
  const withCents = cents > 0 ? `${text} et ${cents} centime${cents > 1 ? 's' : ''}` : text;
  return withCents.charAt(0).toUpperCase() + withCents.slice(1);
}
