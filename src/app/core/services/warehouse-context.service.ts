import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const WAREHOUSE_ID_KEY = 'warehouse_id';
const DEFAULT_WAREHOUSE_ID = 'wh_1';

@Injectable({
  providedIn: 'root'
})
export class WarehouseContextService {
  private readonly warehouseIdSubject = new BehaviorSubject<string>(
    localStorage.getItem(WAREHOUSE_ID_KEY) ?? DEFAULT_WAREHOUSE_ID
  );

  readonly warehouseId$ = this.warehouseIdSubject.asObservable();

  get warehouseId(): string {
    return this.warehouseIdSubject.value;
  }

  setWarehouseId(id: string): void {
    localStorage.setItem(WAREHOUSE_ID_KEY, id);
    this.warehouseIdSubject.next(id);
  }
}
