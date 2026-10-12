import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { PaymentMethod, Sale, SaleType } from '../../../core/models/sale.model';
import { CreateSaleItem } from '../../../core/services/sales-api.service';

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

export interface SalesFormState {
  type: SaleType;
  customerId: string | null;
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
