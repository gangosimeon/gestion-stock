import { Component, inject } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';

import { StockApiService } from '../../../core/services/stock-api.service';

@Component({
  selector: 'app-stock-page',
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './stock-page.component.html'
})
export class StockPageComponent {
  private readonly api = inject(StockApiService);

  readonly movements$ = this.api.listMovements();
}
