import { Component, inject } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';

import { ReportsApiService } from '../../../core/services/reports-api.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './reports-page.component.html'
})
export class ReportsPageComponent {
  private readonly api = inject(ReportsApiService);

  readonly daily$ = this.api.daily(new Date().toISOString().slice(0, 10));
}
