import { Component, inject } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';

import { SalesApiService } from '../../../core/services/sales-api.service';

@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './sales-page.component.html'
})
export class SalesPageComponent {
  private readonly api = inject(SalesApiService);

  readonly sales$ = this.api.list();
}
