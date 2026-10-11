import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

import { Warehouse } from '../models/warehouse.model';

const WAREHOUSE_KEY = 'current_warehouse';
/** Ancienne clé (identifiant simulé seul) : effacée à la lecture. */
const LEGACY_WAREHOUSE_ID_KEY = 'warehouse_id';

/** Dépôt choisi dans l'en-tête : identifiant réel (UUID du backend) et nom. */
export interface SelectedWarehouse {
  id: string;
  name: string;
}

/**
 * Magasin courant de l'utilisateur. L'identifiant est celui du backend ; c'est le backend qui
 * vérifie l'accès au dépôt (en-tête X-Warehouse-Id) et, sans choix, applique le dépôt par défaut.
 */
@Injectable({
  providedIn: 'root'
})
export class WarehouseContextService {
  private readonly warehouseSubject = new BehaviorSubject<SelectedWarehouse | null>(this.load());

  readonly warehouse$ = this.warehouseSubject.asObservable();
  readonly warehouseId$ = this.warehouse$.pipe(map((w) => w?.id ?? ''));

  /** Identifiant du dépôt choisi, ou `null` (le backend applique alors le dépôt par défaut). */
  get warehouseId(): string | null {
    return this.warehouseSubject.value?.id ?? null;
  }

  get warehouseName(): string | null {
    return this.warehouseSubject.value?.name ?? null;
  }

  select(warehouse: Pick<Warehouse, 'id' | 'name'>): void {
    const selected: SelectedWarehouse = { id: warehouse.id, name: warehouse.name };
    try {
      localStorage.setItem(WAREHOUSE_KEY, JSON.stringify(selected));
    } catch {
      // Stockage indisponible : le choix vaut pour la session en cours.
    }
    this.warehouseSubject.next(selected);
  }

  /**
   * Garde le choix s'il fait partie des dépôts visibles par l'utilisateur, sinon l'oublie
   * (changement d'utilisateur, dépôt désactivé…). Renvoie `true` si un choix valide subsiste.
   */
  keepIfVisible(visible: readonly Warehouse[]): boolean {
    const current = this.warehouseSubject.value;
    const match = current ? visible.find((w) => w.id === current.id) : undefined;
    if (match) {
      if (match.name !== current?.name) this.select(match);
      return true;
    }
    this.reset();
    return false;
  }

  /** Oublie le choix (déconnexion, nouvel utilisateur). */
  reset(): void {
    try {
      localStorage.removeItem(WAREHOUSE_KEY);
      localStorage.removeItem(LEGACY_WAREHOUSE_ID_KEY);
    } catch {
      // ignoré
    }
    this.warehouseSubject.next(null);
  }

  private load(): SelectedWarehouse | null {
    try {
      localStorage.removeItem(LEGACY_WAREHOUSE_ID_KEY);
      const json = localStorage.getItem(WAREHOUSE_KEY);
      const parsed = json ? (JSON.parse(json) as Partial<SelectedWarehouse>) : null;
      return parsed?.id && parsed.name ? { id: parsed.id, name: parsed.name } : null;
    } catch {
      return null;
    }
  }
}
