import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-receive-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-receive-dialog.component.html'
})
export class ConfirmReceiveDialogComponent {
  readonly data = inject<{ title: string; message: string }>(MAT_DIALOG_DATA);
}
