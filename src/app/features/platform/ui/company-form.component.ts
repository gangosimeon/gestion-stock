import { Component, EventEmitter, Input, OnChanges, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { DatePickerDirective } from '../../../shared/date/date-picker.directive';
import { Company, CompanyPlan, CompanyRequest, planLabels } from '../data/platform.models';

const CODE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;
const PHONE = /^[0-9+() .-]*$/;

/** Code proposé à partir du nom commercial : minuscules sans accents, tirets. */
export function suggestCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/**
 * Formulaire entreprise. Création : code, identifiant de l'administrateur et couleurs initiales en plus ;
 * en modification, le code et l'administrateur ne changent pas (le code sert à la connexion).
 */
@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, DatePickerDirective],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="company-form">
      <section class="card company-form__section">
        <h2 class="section-title">Identité</h2>
        <div class="company-form__grid">
          <mat-form-field appearance="outline">
            <mat-label>Nom commercial *</mat-label>
            <input matInput formControlName="tradeName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Raison sociale *</mat-label>
            <input matInput formControlName="legalName" />
          </mat-form-field>
          @if (!company) {
            <mat-form-field appearance="outline">
              <mat-label>Code entreprise *</mat-label>
              <input matInput formControlName="code" autocapitalize="none" spellcheck="false" />
              <mat-hint>Utilisé pour se connecter. Minuscules, chiffres et tirets ; ne change plus.</mat-hint>
              @if (form.controls.code.hasError('pattern')) {
                <mat-error>Minuscules, chiffres et tirets (2 à 40 caractères)</mat-error>
              }
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>Secteur d'activité</mat-label>
            <input matInput formControlName="sector" placeholder="Quincaillerie, commerce…" />
          </mat-form-field>
        </div>
      </section>

      <section class="card company-form__section">
        <h2 class="section-title">Coordonnées</h2>
        <div class="company-form__grid">
          <mat-form-field appearance="outline" class="company-form__wide">
            <mat-label>Adresse</mat-label>
            <input matInput formControlName="address" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ville</mat-label>
            <input matInput formControlName="city" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pays</mat-label>
            <input matInput formControlName="country" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Téléphone</mat-label>
            <input matInput formControlName="phone" type="tel" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Site web</mat-label>
            <input matInput formControlName="website" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Identifiant fiscal (NCC)</mat-label>
            <input matInput formControlName="taxId" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Devise</mat-label>
            <input matInput formControlName="currency" />
          </mat-form-field>
        </div>
      </section>

      <section class="card company-form__section">
        <h2 class="section-title">Propriétaire et administrateur</h2>
        <div class="company-form__grid">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="ownerFirstName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom *</mat-label>
            <input matInput formControlName="ownerLastName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput formControlName="ownerEmail" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Téléphone</mat-label>
            <input matInput formControlName="ownerPhone" type="tel" />
          </mat-form-field>
          @if (!company) {
            <mat-form-field appearance="outline">
              <mat-label>Identifiant de l'administrateur *</mat-label>
              <input matInput formControlName="adminUsername" autocapitalize="none" spellcheck="false" />
              <mat-hint>Son mot de passe sera choisi via un lien d'activation.</mat-hint>
            </mat-form-field>
          }
        </div>
      </section>

      <section class="card company-form__section">
        <h2 class="section-title">Abonnement</h2>
        <div class="company-form__grid">
          <mat-form-field appearance="outline">
            <mat-label>Formule</mat-label>
            <mat-select formControlName="plan">
              @for (p of plans; track p.value) {
                <mat-option [value]="p.value">{{ p.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Début</mat-label>
            <input matInput type="date" formControlName="subscriptionStartsOn" appDatePicker #startPicker="datePicker" />
            <button mat-icon-button matSuffix type="button" (click)="startPicker.open()" aria-label="Choisir dans le calendrier">
              <mat-icon>calendar_month</mat-icon>
            </button>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fin</mat-label>
            <input matInput type="date" formControlName="subscriptionEndsOn" appDatePicker #endPicker="datePicker" />
            <button mat-icon-button matSuffix type="button" (click)="endPicker.open()" aria-label="Choisir dans le calendrier">
              <mat-icon>calendar_month</mat-icon>
            </button>
          </mat-form-field>
        </div>
      </section>

      @if (!company) {
        <section class="card company-form__section">
          <h2 class="section-title">Couleurs initiales</h2>
          <div class="company-form__colors">
            <label>Couleur principale <input type="color" formControlName="primaryColor" /></label>
            <label>Couleur secondaire <input type="color" formControlName="secondaryColor" /></label>
          </div>
        </section>
      }

      @if (error) {
        <div class="error" role="alert">{{ error }}</div>
      }
      <div class="company-form__actions">
        <span class="company-form__legend">* champs obligatoires</span>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || busy">
          <mat-icon>{{ company ? 'save' : 'add_business' }}</mat-icon>
          {{ company ? 'Enregistrer' : "Créer l'entreprise" }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .company-form {
        display: grid;
        gap: 16px;
      }
      .company-form__section {
        padding: 16px;
      }
      .company-form__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
        gap: 4px 16px;
      }
      .company-form__wide {
        grid-column: 1 / -1;
      }
      .company-form__colors {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
      }
      .company-form__colors label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .company-form__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 16px;
      }
      .company-form__legend {
        color: var(--color-text-secondary);
        font-size: 12px;
        margin-right: auto;
      }
    `
  ]
})
export class CompanyFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);

  /** Entreprise modifiée ; absente : création. */
  @Input() company: Company | null = null;
  @Input() busy = false;
  @Input() error: string | null = null;
  @Output() readonly submitted = new EventEmitter<CompanyRequest>();

  readonly plans = Object.entries(planLabels).map(([value, label]) => ({ value: value as CompanyPlan, label }));

  private codeEdited = false;

  readonly form = this.fb.group({
    tradeName: ['', [Validators.required, Validators.maxLength(150)]],
    legalName: ['', [Validators.required, Validators.maxLength(150)]],
    code: ['', [Validators.required, Validators.pattern(CODE)]],
    sector: ['', Validators.maxLength(100)],
    address: ['', Validators.maxLength(255)],
    city: ['', Validators.maxLength(100)],
    country: ["Côte d'Ivoire", Validators.maxLength(100)],
    phone: ['', [Validators.maxLength(30), Validators.pattern(PHONE)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    website: ['', Validators.maxLength(200)],
    taxId: ['', Validators.maxLength(100)],
    currency: ['FCFA', Validators.maxLength(10)],
    ownerFirstName: ['', Validators.maxLength(100)],
    ownerLastName: ['', [Validators.required, Validators.maxLength(100)]],
    ownerEmail: ['', [Validators.email, Validators.maxLength(254)]],
    ownerPhone: ['', [Validators.maxLength(30), Validators.pattern(PHONE)]],
    adminUsername: ['admin', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,50}$/)]],
    plan: ['STANDARD' as CompanyPlan],
    subscriptionStartsOn: [''],
    subscriptionEndsOn: [''],
    primaryColor: ['#2563EB'],
    secondaryColor: ['#7C3AED']
  });

  ngOnInit(): void {
    this.form.controls.code.valueChanges.subscribe(() => {
      if (this.form.controls.code.dirty) this.codeEdited = true;
    });
    this.form.controls.tradeName.valueChanges.subscribe((name) => {
      if (!this.company && !this.codeEdited) {
        this.form.controls.code.setValue(suggestCode(name ?? ''), { emitEvent: false });
      }
    });
  }

  ngOnChanges(): void {
    if (this.company) {
      const c = this.company;
      this.form.patchValue({
        tradeName: c.tradeName,
        legalName: c.legalName,
        sector: c.sector ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        country: c.country ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        website: c.website ?? '',
        taxId: c.taxId ?? '',
        currency: c.currency,
        ownerFirstName: c.ownerFirstName ?? '',
        ownerLastName: c.ownerLastName,
        ownerEmail: c.ownerEmail ?? '',
        ownerPhone: c.ownerPhone ?? '',
        plan: c.plan,
        subscriptionStartsOn: c.subscriptionStartsOn ?? '',
        subscriptionEndsOn: c.subscriptionEndsOn ?? ''
      });
      // Code et administrateur figés après la création.
      this.form.controls.code.disable();
      this.form.controls.adminUsername.disable();
    }
  }

  submit(): void {
    if (this.form.invalid || this.busy) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const blank = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
    const request: CompanyRequest = {
      legalName: v.legalName!.trim(),
      tradeName: v.tradeName!.trim(),
      sector: blank(v.sector),
      address: blank(v.address),
      city: blank(v.city),
      country: blank(v.country),
      phone: blank(v.phone),
      email: blank(v.email),
      website: blank(v.website),
      taxId: blank(v.taxId),
      currency: blank(v.currency),
      ownerFirstName: blank(v.ownerFirstName),
      ownerLastName: v.ownerLastName!.trim(),
      ownerEmail: blank(v.ownerEmail),
      ownerPhone: blank(v.ownerPhone),
      plan: v.plan,
      subscriptionStartsOn: blank(v.subscriptionStartsOn),
      subscriptionEndsOn: blank(v.subscriptionEndsOn)
    };
    if (!this.company) {
      request.code = v.code!.trim();
      request.adminUsername = v.adminUsername!.trim();
      request.primaryColor = v.primaryColor;
      request.secondaryColor = v.secondaryColor;
    }
    this.submitted.emit(request);
  }
}
