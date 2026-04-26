import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.scss'
})
export class LayoutShellComponent {
  private readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
