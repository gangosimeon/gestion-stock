export type InventoryStatus = 'DRAFT' | 'IN_PROGRESS' | 'COUNTING' | 'VALIDATION' | 'COMPLETED' | 'CANCELLED';

export interface InventoryLine {
  productId: string;
  productSku: string;
  productName: string;
  /** Stock système saisi par le backend au moment du comptage. */
  systemQuantity: number;
  physicalQuantity: number;
  /** Écart calculé par le backend (compté − système). */
  difference: number;
}

export interface InventorySession {
  id: string;
  createdAt: string;
  createdByUserId: string;
  note?: string | null;
  lines: InventoryLine[];
  itemsCount: number;
  totalDifference: number;
  // Champs du backend.
  /** Numéro lisible INV-AAAA-nnnnnn. */
  number?: string;
  /** COMPLETED : stock ajusté ; VALIDATION : en attente d'un valideur (inventory:validate). */
  status?: InventoryStatus;
  warehouseId?: string;
  validatedAt?: string | null;
}

export const inventoryStatusLabels: Record<InventoryStatus, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  COUNTING: 'Comptage',
  VALIDATION: 'En attente de validation',
  COMPLETED: 'Validé (stock ajusté)',
  CANCELLED: 'Annulé'
};
