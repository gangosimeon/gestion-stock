import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ConsentError } from '../data/consent';
import { priceProposalError } from '../data/price-proposals';
import { PriceProposalsApiService } from '../data/price-proposals-api.service';

/** Contexte transmis au dialogue (liaison + proposition + produit concerné). */
export interface RejectProposalDialogData {
  linkId: string;
  proposalId: string;
  productName: string;
  productSku: string;
}

/** Résultat renvoyé à l'écran parent. */
export type RejectProposalDialogResult =
  | { success: true }
  | { success: false; error: ConsentError }
  | undefined;

/** Regex des caractères de contrôle interdits : tout sauf tabulation (0x09) et saut de ligne (0x0A). */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/**
 * Dialogue de refus d'une proposition de prix : motif obligatoire (1–500 points de code),
 * sans caractère de contrôle (sauf tabulation et saut de ligne).
 * Se ferme avec `{ success: true }` ou `{ success: false, error }` selon le résultat de l'appel.
 */
@Component({
  selector: 'app-reject-proposal-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Refuser la proposition de prix</h2>
    <div mat-dialog-content>
      <p class="proposal-ref">{{ data.productName }} &mdash; {{ data.productSku }}</p>

      @if (apiError(); as err) {
        <div role="alert" class="dialog-error">
          <p class="dialog-error-title">{{ err.message }}</p>
          <p>{{ err.action }}</p>
        </div>
      }

      <mat-form-field appearance="outline" class="reason-field">
        <mat-label>Motif du refus</mat-label>
        <textarea
          matInput
          [formControl]="reasonCtrl"
          rows="4"
          placeholder="Expliquez pourquoi ce prix n'est pas accept\u00e9\u2026"
        ></textarea>
        <mat-hint align="end">{{ codePointCount }}&thinsp;/&thinsp;500</mat-hint>
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="undefined">Annuler</button>
      <button
        mat-flat-button
        color="warn"
        type="button"
        data-test="confirm-reject"
        [disabled]="!isValid || sending()"
        (click)="confirm()"
      >
        Refuser
      </button>
    </div>
  `,
  styles: [`
    .proposal-ref { margin: 0 0 12px; font-weight: 500; }
    .reason-field { width: 100%; min-width: 320px; }
    .dialog-error {
      border-radius: 6px;
      padding: 10px 14px;
      margin: 0 0 12px;
      background: var(--color-danger-soft, #fef2f2);
      border: 1px solid var(--color-danger-border, #fca5a5);
      color: var(--color-danger-text, #b91c1c);
      p { margin: 2px 0; font-size: 0.875rem; }
    }
    .dialog-error-title { font-weight: 600; }
  `]
})
export class RejectProposalDialogComponent {
  readonly data = inject<RejectProposalDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RejectProposalDialogComponent, RejectProposalDialogResult>);
  private readonly api = inject(PriceProposalsApiService);

  readonly reasonCtrl = new FormControl('', { nonNullable: true });
  readonly sending = signal(false);
  readonly apiError = signal<ConsentError | null>(null);

  get codePointCount(): number {
    return [...this.reasonCtrl.value.trim()].length;
  }

  get isValid(): boolean {
    const trimmed = this.reasonCtrl.value.trim();
    if (trimmed.length === 0) return false;
    if ([...trimmed].length > 500) return false;
    if (CONTROL_CHARS.test(this.reasonCtrl.value)) return false;
    return true;
  }

  confirm(): void {
    if (!this.isValid || this.sending()) return;
    const trimmed = this.reasonCtrl.value.trim();
    this.sending.set(true);
    this.apiError.set(null);
    this.api.reject(this.data.linkId, this.data.proposalId, trimmed).subscribe({
      next: () => this.ref.close({ success: true }),
      error: (err: unknown) => {
        const error = priceProposalError(err);
        // 400 (validation backend) : on reste dans le dialogue
        if (err instanceof HttpErrorResponse && err.status === 400) {
          this.sending.set(false);
          this.apiError.set(error);
        } else {
          this.ref.close({ success: false, error });
        }
      }
    });
  }
}
