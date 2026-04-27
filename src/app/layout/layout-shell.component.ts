import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../core/services/auth.service';
import { WarehouseContextService } from '../core/services/warehouse-context.service';
import { WarehousesApiService } from '../core/services/warehouses-api.service';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterOutlet, MatFormFieldModule, MatSelectModule],
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.scss'
})
export class LayoutShellComponent {
  private readonly auth = inject(AuthService);
  private readonly warehousesApi = inject(WarehousesApiService);
  private readonly warehouseCtx = inject(WarehouseContextService);

  readonly warehouses$ = this.warehousesApi.list();
  readonly warehouseId$ = this.warehouseCtx.warehouseId$;

  logout(): void {
    this.auth.logout();
  }

  setWarehouse(id: string): void {
    this.warehouseCtx.setWarehouseId(id);
  }
}
