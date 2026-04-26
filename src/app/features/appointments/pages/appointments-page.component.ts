import { Component, inject } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';

import { AppointmentsApiService } from '../../../core/services/appointments-api.service';

@Component({
  selector: 'app-appointments-page',
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './appointments-page.component.html'
})
export class AppointmentsPageComponent {
  private readonly api = inject(AppointmentsApiService);

  readonly appointments$ = this.api.list();
}
