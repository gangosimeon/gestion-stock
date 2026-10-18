import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { PaymentMethod, Sale, SaleType } from '../../../core/models/sale.model';
import { CreateSaleItem } from '../../../core/services/sales-api.service';
import { QuoteReference } from '../../../core/models/quote.model';

export interface CartRow {
  productId: string;
  sku: string;
  name: string;
  /** Stock du dépôt courant au chargement (indication ; le backend refuse une survente). */
  stockQuantity: number;
  quantity: number;
  /** Tarif affiché (aperçu) ; le backend applique le tarif du produit. */
  unitPrice: number;
  lineTotal: number;
}

/** Client saisi à la caisse (pas encore dans la base). */
export interface NewCustomerDraft {
  name: string;
  phone: string;
}

export interface SalesFormState {
  type: SaleType;
  customerId: string | null;
  /** Saisie d'un nouveau client (exclusif de customerId) ; null : client existant ou comptoir. */
  newCustomer: NewCustomerDraft | null;
  paymentMethod: PaymentMethod;
  /** Paiement partiel : montant payé maintenant (le reste est porté au compte du client). */
  paidAmount: number;
  partialPayment: boolean;
}

/** Aperçu du panier ; les montants qui font foi sont ceux de la vente renvoyée par le backend. */
export interface SalesTotals {
  total: number;
  itemsCount: number;
}

/**
 * Vente préparée à partir d'un devis (« Générer la facture ») : une fois la vente enregistrée,
 * elle est rattachée au devis, qui passe à « Facturé ».
 */
export interface QuoteCheckout {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  /** Produits du devis absents du catalogue actif du dépôt : non repris dans le panier. */
  missing: string[];
  /** pending : vente à valider ; linked : devis facturé ; error : vente enregistrée, rattachement à refaire. */
  status: 'pending' | 'linking' | 'linked' | 'error';
  /** Informations du devis reprises sur la facture définitive. */
  reference: QuoteReference;
  saleId: string | null;
  saleNumber: string | null;
  error: string | null;
}

export interface SalesVm {
  isLoading: boolean;
  errorMessage: string | null;
  products: Product[];
  customers: Customer[];
  cart: CartRow[];
  form: SalesFormState;
  totals: SalesTotals;
  lastSale: Sale | null;
  /** Permission sale:create (interface seulement). */
  canSell: boolean;
  /** Permission customer:create : ajout d'un client depuis la caisse. */
  canCreateCustomer: boolean;
  /** Vente issue d'un devis, le cas échéant. */
  quote: QuoteCheckout | null;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement'
};

export const saleTypeLabels: Record<SaleType, string> = {
  RETAIL: 'Détail',
  WHOLESALE: 'Gros'
};

/** Lignes envoyées au backend : produit et quantité seulement, jamais de prix ni de coût. */
export function toSaleItems(cart: CartRow[]): CreateSaleItem[] {
  return cart.map((r) => ({ productId: r.productId, quantity: r.quantity }));
}

/** Texte comparable : minuscules, sans accents ni espaces superflus. */
function normalize(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Clients existants qui ressemblent à la saisie (au plus 5) : même téléphone (au moins 4 chiffres
 * communs) ou nom qui contient le texte saisi (au moins 2 lettres). Permet de choisir le client
 * déjà enregistré au lieu de le recréer.
 */
export function matchingCustomers(customers: readonly Customer[], draft: NewCustomerDraft | null): Customer[] {
  if (!draft) return [];
  const digits = draft.phone.replace(/\D/g, '');
  const name = normalize(draft.name);
  if (digits.length < 4 && name.length < 2) return [];
  return customers
    .filter((c) => {
      const phoneMatch = digits.length >= 4 && (c.phone ?? '').replace(/\D/g, '').includes(digits);
      const nameMatch = name.length >= 2 && normalize(c.name).includes(name);
      return phoneMatch || nameMatch;
    })
    .slice(0, 5);
}

// --- Encaissement en espèces : montant reçu et monnaie à rendre -------------------------------

/**
 * Remise d'espèces : monnaie à rendre (`change` ≥ 0) ou somme manquante (`missing` > 0).
 * Calcul d'écran seulement : le serveur n'enregistre que le montant payé (jamais plus que le total).
 */
export interface CashTender {
  received: number;
  due: number;
  change: number;
  missing: number;
}

export function cashTender(received: number | null | undefined, due: number): CashTender | null {
  const amount = Number(received);
  if (received === null || received === undefined || !Number.isFinite(amount) || amount < 0) return null;
  const owed = Math.max(0, Number(due) || 0);
  return {
    received: amount,
    due: owed,
    change: Math.max(0, amount - owed),
    missing: Math.max(0, owed - amount)
  };
}

/**
 * Montants proposés en un clic pour un montant dû : le compte juste, puis les montants ronds
 * supérieurs les plus courants (arrondis au millier, aux 5 000, 10 000…) ; 5 au plus, croissants.
 */
export function quickCashAmounts(due: number): number[] {
  const owed = Math.ceil(Math.max(0, Number(due) || 0));
  if (owed === 0) return [];
  const steps = [500, 1000, 2000, 5000, 10000, 20000, 50000];
  const amounts = new Set<number>([owed]);
  for (const step of steps) {
    const rounded = Math.ceil(owed / step) * step;
    if (rounded > owed) amounts.add(rounded);
  }
  return [...amounts].sort((a, b) => a - b).slice(0, 5);
}
