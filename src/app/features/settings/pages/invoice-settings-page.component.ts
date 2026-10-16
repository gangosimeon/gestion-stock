import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom, map, startWith } from 'rxjs';

import { toMessage } from '../../../core/interceptors/api-error.interceptor';
import {
  InvoiceDateFormat,
  InvoiceSettings,
  InvoiceSettingsResponse,
  cloneInvoiceSettings,
  defaultInvoiceSettings,
  settingsOf
} from '../../../core/models/invoice-settings.model';
import {
  InvoiceSettingsApiService,
  InvoiceSettingsStore,
  LOGO_ACCEPTED_TYPES,
  LOGO_MAX_BYTES,
  readAsDataUrl
} from '../../../core/services/invoice-settings-api.service';
import { confirmWith } from '../../../shared/dialog/confirm-dialog.component';
import { sampleInvoiceData } from '../../../shared/invoice/invoice-data';
import { InvoiceDocumentComponent } from '../../../shared/invoice/invoice-document.component';
import { formatInvoiceDate } from '../../../shared/invoice/invoice-format';
import { printInvoice } from '../../../shared/invoice/invoice-output';
import { InvoicePreviewDialogComponent, InvoicePreviewDialogData } from '../ui/invoice-preview-dialog.component';

/** Mêmes règles que le serveur (InvoiceSettings) : un refus local évite un aller-retour. */
const PHONE = /^[0-9+() .-]*$/;
const EMAIL = /^$|^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const WEBSITE = /^$|^(https?:\/\/)?[^\s/]+\.[^\s]+$/;
const COLOR = /^#[0-9A-Fa-f]{6}$/;
const LOGO_MAX_DIMENSION = 4000;

type ColorControl = 'primaryColor' | 'secondaryColor' | 'textColor';

type LogoState =
  | { kind: 'saved'; url: string | null }
  | { kind: 'pending'; file: File; url: string }
  | { kind: 'removed' };

/**
 * Paramètres → Configuration de la facture. Formulaire en quatre onglets et aperçu en direct
 * (données d'exemple). Rien n'est appliqué tant que le serveur n'a pas confirmé l'enregistrement ;
 * le logo choisi reste en attente jusqu'à « Enregistrer ».
 */
@Component({
  selector: 'app-invoice-settings-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    InvoiceDocumentComponent
  ],
  templateUrl: './invoice-settings-page.component.html',
  styleUrl: './invoice-settings-page.component.scss'
})
export class InvoiceSettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(InvoiceSettingsApiService);
  private readonly store = inject(InvoiceSettingsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('previewDocument') private previewDocument?: InvoiceDocumentComponent;

  readonly logoMaxMb = LOGO_MAX_BYTES / (1024 * 1024);
  readonly sample = sampleInvoiceData();

  readonly form = this.fb.group({
    company: this.fb.group({
      companyName: ['', Validators.maxLength(150)],
      legalName: ['', Validators.maxLength(150)],
      slogan: ['', Validators.maxLength(200)],
      address: ['', Validators.maxLength(255)],
      city: ['', Validators.maxLength(100)],
      country: ['', Validators.maxLength(100)],
      phone: ['', [Validators.maxLength(50), Validators.pattern(PHONE)]],
      email: ['', [Validators.maxLength(254), Validators.pattern(EMAIL)]],
      website: ['', [Validators.maxLength(200), Validators.pattern(WEBSITE)]],
      registrationNumber: ['', Validators.maxLength(100)],
      taxId: ['', Validators.maxLength(100)]
    }),
    header: this.fb.group({
      showLogo: true,
      showCompanyName: true,
      showSlogan: true,
      showAddress: true,
      showCityCountry: true,
      showPhone: true,
      showEmail: true,
      showWebsite: true,
      showRegistrationNumber: true,
      showTaxId: true,
      showWarehouse: false,
      logoPosition: this.fb.control<InvoiceSettings['header']['logoPosition']>('LEFT'),
      headerAlignment: this.fb.control<InvoiceSettings['header']['headerAlignment']>('RIGHT'),
      headerSeparator: true,
      headerNote: ['', Validators.maxLength(300)]
    }),
    footer: this.fb.group({
      thankYouMessage: ['', Validators.maxLength(300)],
      showThankYou: true,
      salesTerms: ['', Validators.maxLength(1000)],
      showSalesTerms: true,
      returnPolicy: ['', Validators.maxLength(1000)],
      showReturnPolicy: true,
      paymentTerms: ['', Validators.maxLength(500)],
      showPaymentTerms: true,
      paymentDetails: ['', Validators.maxLength(500)],
      showPaymentDetails: true,
      promoMessage: ['', Validators.maxLength(300)],
      showPromoMessage: true,
      legalText: ['', Validators.maxLength(1000)],
      showLegalText: true,
      signatureText: ['', Validators.maxLength(200)],
      showSignature: true,
      closingText: ['', Validators.maxLength(300)],
      showClosingText: true,
      footerAlignment: this.fb.control<InvoiceSettings['footer']['footerAlignment']>('CENTER'),
      footerSeparator: true
    }),
    appearance: this.fb.group({
      template: this.fb.control<InvoiceSettings['appearance']['template']>('MODERN'),
      primaryColor: ['#1E3A8A', [Validators.required, Validators.pattern(COLOR)]],
      secondaryColor: ['#F59E0B', [Validators.required, Validators.pattern(COLOR)]],
      textColor: ['#1F2937', [Validators.required, Validators.pattern(COLOR)]],
      dateFormat: this.fb.control<InvoiceDateFormat>('dd/MM/yyyy'),
      currencyLabel: this.fb.control<InvoiceSettings['appearance']['currencyLabel']>('FCFA'),
      thousandsSeparator: this.fb.control<InvoiceSettings['appearance']['thousandsSeparator']>('SPACE'),
      decimals: this.fb.control<0 | 2>(0),
      showLineNumber: true,
      showSku: true,
      showDiscountColumn: true,
      showAmountInWords: true,
      showPageNumbers: true,
      pageFooterText: ['', Validators.maxLength(200)],
      showPageFooterText: true
    })
  });

  /** Valeurs du formulaire, pour l'aperçu en direct. */
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue() as InvoiceSettings)
    ),
    { requireSync: true }
  );

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly logoError = signal<string | null>(null);
  readonly lastSavedAt = signal<string | null>(null);
  readonly logo = signal<LogoState>({ kind: 'saved', url: null });
  readonly printing = signal(false);

  /** Dernière configuration confirmée par le serveur (référence de « Annuler les modifications »). */
  private readonly saved = signal<InvoiceSettings>(defaultInvoiceSettings());
  /** Logo enregistré sur le serveur (data URL), ou rien. */
  private savedLogoUrl: string | null = null;

  readonly previewSettings = computed(() => this.withValidColors(this.formValue()));

  readonly previewLogoUrl = computed(() => {
    const logo = this.logo();
    return logo.kind === 'removed' ? null : logo.url;
  });

  readonly dirty = computed(() => !sameSettings(this.formValue(), this.saved()) || this.logo().kind !== 'saved');

  readonly colorControls: { control: ColorControl; label: string }[] = [
    { control: 'primaryColor', label: 'Couleur principale' },
    { control: 'secondaryColor', label: 'Couleur secondaire' },
    { control: 'textColor', label: 'Couleur du texte' }
  ];

  /** Interrupteurs de l'en-tête (onglet « En-tête »). */
  readonly headerToggles: { control: keyof InvoiceSettings['header']; label: string }[] = [
    { control: 'showLogo', label: 'Logo' },
    { control: 'showCompanyName', label: 'Nom de l’entreprise' },
    { control: 'showSlogan', label: 'Slogan' },
    { control: 'showAddress', label: 'Adresse' },
    { control: 'showCityCountry', label: 'Ville et pays' },
    { control: 'showPhone', label: 'Téléphone' },
    { control: 'showEmail', label: 'Email' },
    { control: 'showWebsite', label: 'Site web' },
    { control: 'showRegistrationNumber', label: 'Numéro RCCM' },
    { control: 'showTaxId', label: 'IFU / NIF' },
    { control: 'showWarehouse', label: 'Dépôt de la vente' }
  ];

  /** Mentions du pied de page : texte, interrupteur, longueur maximale. */
  readonly footerFields: {
    text: keyof InvoiceSettings['footer'];
    show: keyof InvoiceSettings['footer'];
    label: string;
    max: number;
    rows: number;
    placeholder: string;
  }[] = [
    { text: 'thankYouMessage', show: 'showThankYou', label: 'Message de remerciement', max: 300, rows: 1, placeholder: 'Merci pour votre confiance !' },
    { text: 'salesTerms', show: 'showSalesTerms', label: 'Conditions de vente', max: 1000, rows: 3, placeholder: 'Les marchandises restent notre propriété jusqu’au paiement complet.' },
    { text: 'returnPolicy', show: 'showReturnPolicy', label: 'Retours et échanges', max: 1000, rows: 3, placeholder: 'Retour accepté sous 7 jours avec la facture.' },
    { text: 'paymentTerms', show: 'showPaymentTerms', label: 'Modalités de paiement', max: 500, rows: 2, placeholder: 'Paiement comptant ou à 30 jours pour les clients en compte.' },
    { text: 'paymentDetails', show: 'showPaymentDetails', label: 'Coordonnées de paiement', max: 500, rows: 2, placeholder: 'Orange Money : … · Banque : …' },
    { text: 'promoMessage', show: 'showPromoMessage', label: 'Message promotionnel', max: 300, rows: 1, placeholder: '' },
    { text: 'legalText', show: 'showLegalText', label: 'Mentions légales', max: 1000, rows: 2, placeholder: '' },
    { text: 'signatureText', show: 'showSignature', label: 'Signature (libellé sous la ligne)', max: 200, rows: 1, placeholder: 'Le gérant' },
    { text: 'closingText', show: 'showClosingText', label: 'Texte de clôture', max: 300, rows: 1, placeholder: '' }
  ];

  readonly dateFormats: { value: InvoiceDateFormat; label: string }[] = (
    ['dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'd MMMM yyyy'] as InvoiceDateFormat[]
  ).map((value) => ({ value, label: formatInvoiceDate(new Date(), value) }));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.applyServerState(response);
          this.loading.set(false);
          // Logo lu à part (binaire authentifié) ; son absence n'empêche pas de configurer.
          this.store.withLogo(response).subscribe((loaded) => {
            this.savedLogoUrl = loaded.logoUrl;
            if (this.logo().kind === 'saved') this.logo.set({ kind: 'saved', url: loaded.logoUrl });
            this.store.set(loaded);
          });
        },
        error: (e: unknown) => {
          this.loading.set(false);
          this.loadError.set(this.messageOf(e, 'Impossible de charger la configuration de la facture.'));
        }
      });
  }

  // --- Logo ---------------------------------------------------------------------------------------

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permet de rechoisir le même fichier
    if (!file) return;
    this.logoError.set(null);

    const error = await this.checkLogo(file);
    if (error) {
      this.logoError.set(error);
      return;
    }
    this.logo.set({ kind: 'pending', file, url: await readAsDataUrl(file) });
  }

  removeLogo(): void {
    this.logoError.set(null);
    const current = this.logo();
    if (current.kind === 'pending') {
      // Abandon du fichier choisi : retour au logo enregistré.
      this.logo.set({ kind: 'saved', url: this.savedLogoUrl });
      return;
    }
    this.logo.set({ kind: 'removed' });
  }

  hasLogo(): boolean {
    return this.previewLogoUrl() !== null;
  }

  // --- Couleurs -----------------------------------------------------------------------------------

  /** Le sélecteur natif renvoie des minuscules : le serveur attend #RRGGBB. */
  onColorPicked(control: ColorControl, event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    const ctrl = this.form.controls.appearance.controls[control];
    ctrl.setValue(value);
    ctrl.markAsDirty();
  }

  colorFor(control: ColorControl): string {
    const value = this.form.controls.appearance.controls[control].value;
    return COLOR.test(value) ? value : '#000000';
  }

  // --- Actions ------------------------------------------------------------------------------------

  async save(): Promise<void> {
    if (this.saving()) return; // pas de double envoi
    this.saveError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError.set('Certains champs sont invalides : corrigez-les avant d’enregistrer.');
      return;
    }

    this.saving.set(true);
    const logo = this.logo();
    let response: InvoiceSettingsResponse;
    try {
      response = await firstValueFrom(this.api.update(this.form.getRawValue() as InvoiceSettings));
    } catch (e) {
      this.saving.set(false);
      this.saveError.set(this.messageOf(e, 'Enregistrement impossible.'));
      return;
    }
    // Configuration confirmée par le serveur ; le logo suit.
    this.applyServerState(response);

    try {
      if (logo.kind === 'pending') {
        const info = await firstValueFrom(this.api.uploadLogo(logo.file));
        response = { ...response, logo: info };
        this.savedLogoUrl = logo.url;
        this.logo.set({ kind: 'saved', url: logo.url });
      } else if (logo.kind === 'removed') {
        await firstValueFrom(this.api.deleteLogo());
        response = { ...response, logo: null };
        this.savedLogoUrl = null;
        this.logo.set({ kind: 'saved', url: null });
      }
    } catch (e) {
      this.saving.set(false);
      this.saveError.set(
        `Configuration enregistrée, mais le logo n’a pas pu l’être : ${this.messageOf(e, 'erreur inconnue')}`
      );
      this.store.invalidate();
      return;
    }

    const current = this.logo();
    this.store.set({ settings: response, logoUrl: current.kind === 'saved' ? current.url : null });
    this.saving.set(false);
    this.snackbar.open('Configuration de la facture enregistrée.', 'OK', { duration: 3000 });
  }

  cancelChanges(): void {
    this.saveError.set(null);
    this.logoError.set(null);
    this.form.reset(cloneInvoiceSettings(this.saved()));
    this.logo.set({ kind: 'saved', url: this.savedLogoUrl });
  }

  async reset(): Promise<void> {
    if (this.saving()) return;
    const confirmed = await confirmWith(this.dialog, {
      title: 'Réinitialiser la configuration ?',
      message:
        'Toutes les informations et options de la facture reviendront aux valeurs par défaut. ' +
        'Le logo enregistré est conservé. Cette action est immédiate.',
      confirmLabel: 'Réinitialiser'
    });
    if (!confirmed) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const response = await firstValueFrom(this.api.reset());
      this.applyServerState(response);
      this.logo.set({ kind: 'saved', url: this.savedLogoUrl });
      this.store.set({ settings: response, logoUrl: this.savedLogoUrl });
      this.snackbar.open('Configuration réinitialisée.', 'OK', { duration: 3000 });
    } catch (e) {
      this.saveError.set(this.messageOf(e, 'Réinitialisation impossible.'));
    } finally {
      this.saving.set(false);
    }
  }

  openPreview(): void {
    this.dialog.open<InvoicePreviewDialogComponent, InvoicePreviewDialogData>(InvoicePreviewDialogComponent, {
      data: { settings: this.previewSettings(), data: this.sample, logoUrl: this.previewLogoUrl() },
      width: '900px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false
    });
  }

  async printPreview(): Promise<void> {
    const root = this.previewDocument?.root();
    if (!root || this.printing()) return;
    this.printing.set(true);
    try {
      await printInvoice(root, this.previewSettings().appearance, 'Aperçu de la facture');
    } finally {
      this.printing.set(false);
    }
  }

  fieldError(group: 'company' | 'header' | 'footer' | 'appearance', name: string): string | null {
    const control = this.form.get([group, name]);
    if (!control || !control.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('maxlength')) {
      return `${control.getError('maxlength').requiredLength} caractères maximum.`;
    }
    if (control.hasError('required')) return 'Valeur requise.';
    if (control.hasError('pattern')) {
      switch (name) {
        case 'email':
          return 'Adresse email invalide.';
        case 'phone':
          return 'Chiffres, espaces et + ( ) . - uniquement.';
        case 'website':
          return 'Adresse de site invalide (ex. www.exemple.bf).';
        default:
          return 'Couleur attendue au format #RRGGBB.';
      }
    }
    return 'Valeur invalide.';
  }

  // --- Interne ------------------------------------------------------------------------------------

  private applyServerState(response: InvoiceSettingsResponse): void {
    const settings = settingsOf(response);
    this.saved.set(settings);
    this.form.reset(cloneInvoiceSettings(settings));
    this.lastSavedAt.set(response.updatedAt);
    if (!response.logo) {
      this.savedLogoUrl = null;
      if (this.logo().kind === 'saved') this.logo.set({ kind: 'saved', url: null });
    }
  }

  private withValidColors(s: InvoiceSettings): InvoiceSettings {
    const saved = this.saved().appearance;
    const a = s.appearance;
    return {
      ...s,
      appearance: {
        ...a,
        primaryColor: COLOR.test(a.primaryColor) ? a.primaryColor : saved.primaryColor,
        secondaryColor: COLOR.test(a.secondaryColor) ? a.secondaryColor : saved.secondaryColor,
        textColor: COLOR.test(a.textColor) ? a.textColor : saved.textColor
      }
    };
  }

  private async checkLogo(file: File): Promise<string | null> {
    if (!(LOGO_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      return 'Format non accepté : choisissez une image PNG ou JPEG.';
    }
    if (file.size > LOGO_MAX_BYTES) {
      return `Fichier trop volumineux : ${this.logoMaxMb} Mo maximum.`;
    }
    try {
      const { width, height } = await imageSize(file);
      if (width > LOGO_MAX_DIMENSION || height > LOGO_MAX_DIMENSION) {
        return `Image trop grande : ${LOGO_MAX_DIMENSION} × ${LOGO_MAX_DIMENSION} pixels maximum.`;
      }
    } catch {
      return 'Image illisible ou endommagée.';
    }
    return null;
  }

  private messageOf(e: unknown, fallback: string): string {
    if (e instanceof HttpErrorResponse) return toMessage(e);
    return e instanceof Error ? e.message : fallback;
  }
}

/** Même configuration, champ par champ (indépendant de l'ordre des propriétés). */
function sameSettings(a: InvoiceSettings, b: InvoiceSettings): boolean {
  return (['company', 'header', 'footer', 'appearance'] as const).every((section) => {
    const x = a[section] as unknown as Record<string, unknown>;
    const y = b[section] as unknown as Record<string, unknown>;
    return Object.keys(y).every((key) => x[key] === y[key]);
  });
}

/** Dimensions d'une image locale (avant envoi). */
function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}
