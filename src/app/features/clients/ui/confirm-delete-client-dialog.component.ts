import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type ConfirmDeleteClientDialogData = {
  name: string;
};

@Component({
  selector: 'app-confirm-delete-client-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-delete-client-dialog.component.html'
})
export class ConfirmDeleteClientDialogComponent {
  private readonly ref = inject(MatDialogRef<ConfirmDeleteClientDialogComponent>);
  readonly data = inject<ConfirmDeleteClientDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.ref.close(true);
  }
}
