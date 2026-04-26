import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-delete-user-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-delete-user-dialog.component.html'
})
export class ConfirmDeleteUserDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: { title: string; message: string }
  ) {}
}
