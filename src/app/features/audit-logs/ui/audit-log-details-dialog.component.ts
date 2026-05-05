import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuditLogEntry } from '../../../core/models/audit-log.model';

export type AuditLogDetailsDialogData = {
  log: AuditLogEntry;
};

@Component({
  selector: 'app-audit-log-details-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './audit-log-details-dialog.component.html',
  styles: [`
    .detail-grid {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 8px 16px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .detail-label {
      color: #64748B;
      font-weight: 500;
    }
    .detail-value {
      color: #0F172A;
      word-break: break-all;
    }
    .changes-title {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 8px;
      color: #0F172A;
    }
    .changes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
    }
    .changes-table th {
      background: #F1F5F9;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 11px;
    }
    .changes-table td {
      padding: 8px 12px;
      border-top: 1px solid #E2E8F0;
    }
    .old-value {
      background: #FEF2F2;
      color: #991B1B;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .new-value {
      background: #ECFDF5;
      color: #065F46;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .status-badge {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-badge--success { background: #ECFDF5; color: #065F46; }
    .status-badge--failure { background: #FEF2F2; color: #991B1B; }
  `]
})
export class AuditLogDetailsDialogComponent {
  readonly data = inject<AuditLogDetailsDialogData>(MAT_DIALOG_DATA);
}
