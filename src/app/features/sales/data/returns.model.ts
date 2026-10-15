import { CustomerReturn } from '../../../core/models/customer-return.model';
import { Sale } from '../../../core/models/sale.model';

/** Article d'une vente vu depuis un retour : ce qui reste à rendre et son prix net unitaire. */
export interface ReturnableLine {
  productId: string;
  productName: string;
  productSku: string;
  sold: number;
  alreadyReturned: number;
  /** Quantité encore retournable (vendue − déjà retournée), jamais négative. */
  remaining: number;
  /** Prix unitaire net de la vente (remise comprise) : base du remboursement. */
  unitNet: number;
}

/**
 * Articles de la vente avec la quantité encore retournable, compte tenu des retours déjà
 * enregistrés. Aide à la saisie : le serveur refait le même contrôle.
 */
export function returnableLines(sale: Sale, returns: readonly CustomerReturn[]): ReturnableLine[] {
  const returned = new Map<string, number>();
  for (const r of returns) {
    for (const l of r.lines) returned.set(l.productId, (returned.get(l.productId) ?? 0) + l.quantity);
  }
  return sale.items.map((it) => {
    const alreadyReturned = returned.get(it.productId) ?? 0;
    const lineTotal = it.lineTotal ?? it.unitPrice * it.quantity;
    return {
      productId: it.productId,
      productName: it.productName ?? it.productId,
      productSku: it.productSku ?? '',
      sold: it.quantity,
      alreadyReturned,
      remaining: Math.max(0, it.quantity - alreadyReturned),
      unitNet: it.quantity > 0 ? lineTotal / it.quantity : 0
    };
  });
}

/** Montant estimé du retour (le montant définitif est calculé par le serveur). */
export function estimateReturn(lines: readonly ReturnableLine[], quantities: Readonly<Record<string, number>>): number {
  const total = lines.reduce((sum, l) => sum + l.unitNet * Math.max(0, quantities[l.productId] ?? 0), 0);
  return Math.round(total * 100) / 100;
}

/** Il reste au moins un article à rendre sur cette vente. */
export function hasReturnableItems(lines: readonly ReturnableLine[]): boolean {
  return lines.some((l) => l.remaining > 0);
}
