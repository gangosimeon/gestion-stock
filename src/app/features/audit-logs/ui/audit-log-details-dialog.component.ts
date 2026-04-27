import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { AuditLogEntry } from '../../../core/models/audit-log.model';

export type AuditLogDetailsDialogData = {
  log: AuditLogEntry;
};

@Component({
  selector: 'app-audit-log-details-dialog',
  standalone: true,
  imports: [CommonModule, JsonPipe, DatePipe, MatDialogModule, MatButtonModule],
  templateUrl: './audit-log-details-dialog.component.html'
})
export class AuditLogDetailsDialogComponent {
  readonly data = inject<AuditLogDetailsDialogData>(MAT_DIALOG_DATA);
}
