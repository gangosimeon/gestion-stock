import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-delete-supplier-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-delete-supplier-dialog.component.html'
})
export class ConfirmDeleteSupplierDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: { title: string; message: string }
  ) {}
}
