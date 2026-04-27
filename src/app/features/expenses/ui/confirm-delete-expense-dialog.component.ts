import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type ConfirmDeleteExpenseDialogData = {
  label: string;
};

@Component({
  selector: 'app-confirm-delete-expense-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-delete-expense-dialog.component.html'
})
export class ConfirmDeleteExpenseDialogComponent {
  private readonly ref = inject(MatDialogRef<ConfirmDeleteExpenseDialogComponent>);
  readonly data = inject<ConfirmDeleteExpenseDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.ref.close(true);
  }
}
