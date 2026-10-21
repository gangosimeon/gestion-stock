import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { CompanyBranding, DEFAULT_BRANDING_COLORS } from '../../../core/branding/branding.model';
import { luminance } from '../../../core/branding/branding.service';
import { BrandingRequest } from '../data/platform.models';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const LOGO_MAX_BYTES = 1024 * 1024;

type ColorField = keyof typeof DEFAULT_BRANDING_COLORS;

/**
 * Personnalisation d'une entreprise avec aperçu en temps réel (maquette isolée : le thème de
 * l'interface n'est modifié qu'après enregistrement, par la session de l'entreprise). Couleurs
 * #RRGGBB uniquement, logo PNG ou JPEG d'1 Mo au plus (revérifiés par le serveur).
 */
@Component({
  selector: 'app-branding-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="branding">
      <form [formGroup]="form" (ngSubmit)="submit()" class="branding__form card">
        <h2 class="section-title">Couleurs</h2>
        <div class="branding__colors">
          @for (field of colorFields; track field.key) {
            <label class="branding__color">
              <input type="color" [formControlName]="field.key" [attr.aria-label]="field.label" />
              <span>
                <span class="branding__color-label">{{ field.label }}</span>
                <code>{{ form.controls[field.key].value }}</code>
              </span>
            </label>
          }
        </div>

        <div class="branding__row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Mode par défaut</mat-label>
            <mat-select formControlName="themeMode">
              <mat-option value="LIGHT">Clair</mat-option>
              <mat-option value="DARK">Sombre</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-slide-toggle formControlName="highContrast">Contraste renforcé</mat-slide-toggle>
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Texte de pied de page</mat-label>
          <input matInput formControlName="footerText" maxlength="300" />
        </mat-form-field>

        @if (contrastWarning) {
          <p class="branding__warning"><mat-icon>contrast</mat-icon>{{ contrastWarning }}</p>
        }

        <div class="branding__actions">
          <button mat-button type="button" (click)="resetDefaults()">Couleurs GestStock</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || busy">
            <mat-icon>save</mat-icon>
            Enregistrer
          </button>
        </div>

        <h2 class="section-title">Logo</h2>
        <div class="branding__logo-row">
          @if (logoSrc) {
            <img class="branding__logo" [src]="logoSrc" alt="Logo actuel" />
          } @else {
            <span class="branding__no-logo">Aucun logo</span>
          }
          <label class="branding__file">
            <input type="file" accept="image/png,image/jpeg" (change)="onFile($event)" [disabled]="busy" />
            <span mat-stroked-button>Choisir une image (PNG ou JPEG, 1 Mo)</span>
          </label>
          @if (logoSrc) {
            <button mat-button type="button" (click)="deleteLogo.emit()" [disabled]="busy">Retirer</button>
          }
        </div>
        @if (fileError) {
          <div class="error" role="alert">{{ fileError }}</div>
        }

        @if (showPermission) {
          <h2 class="section-title">Autonomie de l'entreprise</h2>
          <mat-slide-toggle [checked]="branding?.companyCanEdit ?? false" (change)="permissionChange.emit($event.checked)">
            L'administrateur de l'entreprise peut modifier lui-même couleurs et logo
          </mat-slide-toggle>
        }
      </form>

      <div class="branding__preview card" aria-label="Aperçu" [class.branding__preview--dark]="form.value.themeMode === 'DARK'">
        <h2 class="section-title">Aperçu</h2>
        <div class="mock" [style.--p]="form.value.primaryColor" [style.--s]="form.value.sidebarColor"
             [style.--h]="form.value.headerColor" [style.--b]="form.value.buttonColor" [style.--l]="form.value.linkColor"
             [style.--a]="form.value.accentColor" [style.--sec]="form.value.secondaryColor">
          <aside class="mock__sidebar" [style.color]="sidebarText">
            <div class="mock__brand">
              @if (logoSrc) { <img [src]="logoSrc" alt="" /> } @else { <span class="mock__initial">{{ initial }}</span> }
              <strong>{{ branding?.companyName ?? 'Entreprise' }}</strong>
            </div>
            <div class="mock__item mock__item--active">Tableau de bord</div>
            <div class="mock__item">Produits</div>
            <div class="mock__item">Ventes</div>
          </aside>
          <div class="mock__main">
            <div class="mock__header" [style.color]="headerText">Ventes du jour</div>
            <div class="mock__body">
              <p>Texte courant avec <span class="mock__link">un lien</span>.</p>
              <span class="mock__chip">Indicateur</span>
              <span class="mock__chip mock__chip--sec">Secondaire</span>
              <button type="button" class="mock__button">Bouton principal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .branding {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 1000px) {
        .branding {
          grid-template-columns: 1fr;
        }
      }
      .branding__form,
      .branding__preview {
        padding: 16px;
        display: grid;
        gap: 12px;
      }
      .branding__colors {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px;
      }
      .branding__color {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }
      .branding__color input {
        width: 40px;
        height: 32px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 2px;
        background: none;
      }
      .branding__color-label {
        display: block;
        font-size: 13px;
      }
      .branding__color code {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .branding__row,
      .branding__actions,
      .branding__logo-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      .branding__actions {
        justify-content: flex-end;
      }
      .branding__logo {
        width: 64px;
        height: 64px;
        object-fit: contain;
        border: 1px solid var(--color-border);
        border-radius: 8px;
      }
      .branding__no-logo {
        color: var(--color-text-secondary);
      }
      .branding__file input {
        font-size: 13px;
      }
      .branding__warning {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-secondary);
        margin: 0;
      }
      .mock {
        display: grid;
        grid-template-columns: 150px 1fr;
        min-height: 220px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        overflow: hidden;
        font-size: 13px;
      }
      .mock__sidebar {
        background: var(--s);
        padding: 12px 8px;
        display: grid;
        align-content: start;
        gap: 6px;
      }
      .mock__brand {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .mock__brand img {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }
      .mock__initial {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        background: var(--p);
        color: #fff;
        display: grid;
        place-items: center;
        font-weight: 700;
      }
      .mock__item {
        padding: 6px 8px;
        border-radius: 6px;
        opacity: 0.85;
      }
      .mock__item--active {
        background: var(--p);
        color: #fff;
        opacity: 1;
      }
      .mock__main {
        background: #f5f8fc;
        display: grid;
        grid-template-rows: auto 1fr;
      }
      .branding__preview--dark .mock__main {
        background: #0f172a;
        color: #e2e8f0;
      }
      .mock__header {
        background: var(--h);
        padding: 10px 12px;
        font-weight: 600;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }
      .mock__body {
        padding: 12px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .mock__body p {
        width: 100%;
        margin: 0;
      }
      .mock__link {
        text-decoration: underline;
        color: var(--l);
      }
      .mock__chip {
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--a);
        color: #fff;
      }
      .mock__chip--sec {
        background: var(--sec);
      }
      .mock__button {
        border: 0;
        border-radius: 8px;
        padding: 8px 14px;
        background: var(--b);
        color: #fff;
        font-weight: 600;
      }
    `
  ]
})
export class BrandingEditorComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() branding: CompanyBranding | null = null;
  @Input() logoSrc: string | null = null;
  @Input() busy = false;
  /** Super Admin : réglage de l'autonomie de l'entreprise. */
  @Input() showPermission = false;

  @Output() readonly save = new EventEmitter<BrandingRequest>();
  @Output() readonly uploadLogo = new EventEmitter<File>();
  @Output() readonly deleteLogo = new EventEmitter<void>();
  @Output() readonly permissionChange = new EventEmitter<boolean>();

  readonly colorFields: { key: ColorField; label: string }[] = [
    { key: 'primaryColor', label: 'Principale' },
    { key: 'secondaryColor', label: 'Secondaire' },
    { key: 'accentColor', label: 'Accent' },
    { key: 'sidebarColor', label: 'Barre latérale' },
    { key: 'headerColor', label: 'En-tête' },
    { key: 'buttonColor', label: 'Boutons' },
    { key: 'linkColor', label: 'Liens et éléments actifs' }
  ];

  fileError: string | null = null;

  readonly form = this.fb.nonNullable.group({
    primaryColor: [DEFAULT_BRANDING_COLORS.primaryColor as string, [Validators.required, Validators.pattern(HEX)]],
    secondaryColor: [DEFAULT_BRANDING_COLORS.secondaryColor as string, [Validators.required, Validators.pattern(HEX)]],
    accentColor: [DEFAULT_BRANDING_COLORS.accentColor as string, [Validators.required, Validators.pattern(HEX)]],
    sidebarColor: [DEFAULT_BRANDING_COLORS.sidebarColor as string, [Validators.required, Validators.pattern(HEX)]],
    headerColor: [DEFAULT_BRANDING_COLORS.headerColor as string, [Validators.required, Validators.pattern(HEX)]],
    buttonColor: [DEFAULT_BRANDING_COLORS.buttonColor as string, [Validators.required, Validators.pattern(HEX)]],
    linkColor: [DEFAULT_BRANDING_COLORS.linkColor as string, [Validators.required, Validators.pattern(HEX)]],
    themeMode: ['LIGHT' as 'LIGHT' | 'DARK'],
    highContrast: [false],
    footerText: ['']
  });

  get initial(): string {
    return (this.branding?.companyName ?? 'E').charAt(0);
  }

  get sidebarText(): string {
    return luminance(this.form.controls.sidebarColor.value) > 0.4 ? '#1F2937' : '#FFFFFF';
  }

  get headerText(): string {
    return luminance(this.form.controls.headerColor.value) > 0.4 ? '#172B4D' : '#FFFFFF';
  }

  /** Alerte de lisibilité : texte blanc sur un bouton trop clair. */
  get contrastWarning(): string | null {
    const button = this.form.controls.buttonColor.value;
    return HEX.test(button) && luminance(button) > 0.45
      ? 'Couleur des boutons très claire : le texte blanc risque d’être peu lisible.'
      : null;
  }

  ngOnChanges(): void {
    const b = this.branding;
    if (b) {
      this.form.patchValue({
        primaryColor: b.primaryColor,
        secondaryColor: b.secondaryColor,
        accentColor: b.accentColor,
        sidebarColor: b.sidebarColor,
        headerColor: b.headerColor,
        buttonColor: b.buttonColor,
        linkColor: b.linkColor,
        themeMode: b.themeMode,
        highContrast: b.highContrast,
        footerText: b.footerText ?? ''
      });
    }
  }

  resetDefaults(): void {
    this.form.patchValue({ ...DEFAULT_BRANDING_COLORS, themeMode: 'LIGHT', highContrast: false });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.save.emit({
      primaryColor: v.primaryColor.toUpperCase(),
      secondaryColor: v.secondaryColor.toUpperCase(),
      accentColor: v.accentColor.toUpperCase(),
      sidebarColor: v.sidebarColor.toUpperCase(),
      headerColor: v.headerColor.toUpperCase(),
      buttonColor: v.buttonColor.toUpperCase(),
      linkColor: v.linkColor.toUpperCase(),
      themeMode: v.themeMode,
      highContrast: v.highContrast,
      footerText: v.footerText.trim() || null
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.fileError = null;
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.fileError = 'Format refusé : choisissez une image PNG ou JPEG.';
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      this.fileError = 'Image trop lourde : 1 Mo au plus.';
      return;
    }
    this.uploadLogo.emit(file);
  }
}
