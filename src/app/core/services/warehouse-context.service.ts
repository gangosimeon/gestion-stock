import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, distinctUntilChanged, filter, map, skip } from 'rxjs';

import { Warehouse } from '../models/warehouse.model';

const WAREHOUSE_KEY = 'current_warehouse';
/** Ancienne clé (identifiant simulé seul) : effacée à la lecture. */
const LEGACY_WAREHOUSE_ID_KEY = 'warehouse_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identifiant de dépôt du backend (UUID) ; un identifiant simulé (`wh_1`) n'en est pas un. */
export function isWarehouseId(value: string | null | undefined): value is string {
  return !!value && UUID_PATTERN.test(value);
}

/**
 * Erreurs du backend sur le dépôt désigné : le choix enregistré peut être périmé (dépôt
 * désactivé ou retiré). Le backend ne le remplace jamais, le front le revalide.
 */
export const WAREHOUSE_SELECTION_ERRORS: readonly string[] = [
  'INVALID_WAREHOUSE_ID',
  'UNKNOWN_WAREHOUSE',
  'WAREHOUSE_INACTIVE',
  'WAREHOUSE_ACCESS_DENIED'
];

/** Dépôt choisi dans l'en-tête : identifiant réel (UUID du backend) et nom. */
export interface SelectedWarehouse {
  id: string;
  name: string;
}

/** Contrôle avant changement de dépôt : `false` (ou promesse de `false`) annule le changement. */
export type SwitchCheck = (target: Pick<Warehouse, 'id' | 'name'>) => boolean | Promise<boolean>;

/**
 * Magasin courant de l'utilisateur. L'identifiant est celui du backend ; c'est le backend qui
 * vérifie l'accès au dépôt (en-tête X-Warehouse-Id) et, sans choix, applique le dépôt par défaut.
 */
@Injectable({
  providedIn: 'root'
})
export class WarehouseContextService {
  private readonly warehouseSubject = new BehaviorSubject<SelectedWarehouse | null>(this.load());
  private readonly revalidationSubject = new Subject<void>();

  private readonly switchChecks = new Set<SwitchCheck>();

  readonly warehouse$ = this.warehouseSubject.asObservable();
  readonly warehouseId$ = this.warehouse$.pipe(map((w) => w?.id ?? ''));
  /** Demandes de revalidation du choix (le sélecteur relit alors les dépôts autorisés). */
  readonly revalidationRequested$ = this.revalidationSubject.asObservable();

  /**
   * Nouveau dépôt courant, après l'abonnement : les données du dépôt précédent sont à recharger.
   * Ni la valeur présente à l'abonnement, ni l'oubli du choix (déconnexion, choix périmé), ni un
   * simple renommage n'émettent ; le passage au dépôt retenu ensuite par le backend émet.
   */
  readonly warehouseChanged$: Observable<string> = this.warehouse$.pipe(
    map((w) => w?.id ?? null),
    filter((id): id is string => id !== null),
    distinctUntilChanged(),
    skip(1)
  );

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
   * Changement de dépôt demandé par l'utilisateur : chaque contrôle enregistré (ex. panier en
   * cours) peut le refuser ; sinon le dépôt est sélectionné. Renvoie `true` si le dépôt a changé.
   */
  async requestSelect(warehouse: Pick<Warehouse, 'id' | 'name'>): Promise<boolean> {
    if (warehouse.id === this.warehouseId) return false;
    for (const check of [...this.switchChecks]) {
      if (!(await check(warehouse))) return false;
    }
    this.select(warehouse);
    return true;
  }

  /**
   * Contrôle avant changement de dépôt par l'utilisateur ; renvoyer `false` annule le changement.
   * Renvoie la fonction de désinscription.
   */
  addSwitchCheck(check: SwitchCheck): () => void {
    this.switchChecks.add(check);
    return () => this.switchChecks.delete(check);
  }

  /**
   * Garde le choix s'il fait partie des dépôts visibles et actifs de l'utilisateur, sinon
   * l'oublie (changement d'utilisateur, dépôt désactivé…). Renvoie `true` si un choix valide subsiste.
   */
  keepIfVisible(visible: readonly Warehouse[]): boolean {
    const current = this.warehouseSubject.value;
    const match = current ? visible.find((w) => w.id === current.id && w.active !== false) : undefined;
    if (match) {
      if (match.name !== current?.name) this.select(match);
      return true;
    }
    this.reset();
    return false;
  }

  /** Le backend a refusé le dépôt envoyé : le sélecteur doit vérifier le choix enregistré. */
  requestRevalidation(): void {
    this.revalidationSubject.next();
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
      if (!isWarehouseId(parsed?.id) || !parsed?.name) {
        if (json) localStorage.removeItem(WAREHOUSE_KEY);
        return null;
      }
      return { id: parsed.id, name: parsed.name };
    } catch {
      return null;
    }
  }
}
