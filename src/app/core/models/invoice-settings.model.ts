/**
 * Configuration de la facture (GET/PUT /api/settings/invoice). Un texte vide signifie « non
 * configuré » : il n'apparaît jamais sur une facture réelle.
 */
export type LogoPosition = 'LEFT' | 'RIGHT' | 'TOP';
export type TextAlignment = 'LEFT' | 'CENTER' | 'RIGHT';
/** En-têtes du tableau des produits ; AUTO : textes à gauche, nombres à droite. */
export type TableHeaderAlignment = 'AUTO' | 'LEFT' | 'CENTER' | 'RIGHT';
/** Police du document ; MODEL : celle du modèle choisi. */
export type InvoiceFont = 'MODEL' | 'TIMES_NEW_ROMAN' | 'ARIAL';
export type InvoiceTemplate = 'CLASSIC' | 'MODERN' | 'COMPACT';
export type ThousandsSeparator = 'SPACE' | 'DOT' | 'COMMA' | 'NONE';
export type InvoiceDateFormat = 'dd/MM/yyyy' | 'dd-MM-yyyy' | 'yyyy-MM-dd' | 'd MMMM yyyy';
export type InvoiceCurrency = 'FCFA' | 'F CFA' | 'XOF';

export interface InvoiceCompany {
  companyName: string;
  legalName: string;
  slogan: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  registrationNumber: string;
  taxId: string;
}

export interface InvoiceHeader {
  showLogo: boolean;
  showCompanyName: boolean;
  showSlogan: boolean;
  showAddress: boolean;
  showCityCountry: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showRegistrationNumber: boolean;
  showTaxId: boolean;
  /** Nom du dépôt où la vente a eu lieu. */
  showWarehouse: boolean;
  logoPosition: LogoPosition;
  headerAlignment: TextAlignment;
  headerSeparator: boolean;
  headerNote: string;
}

export interface InvoiceFooter {
  thankYouMessage: string;
  showThankYou: boolean;
  salesTerms: string;
  showSalesTerms: boolean;
  returnPolicy: string;
  showReturnPolicy: boolean;
  paymentTerms: string;
  showPaymentTerms: boolean;
  paymentDetails: string;
  showPaymentDetails: boolean;
  promoMessage: string;
  showPromoMessage: boolean;
  legalText: string;
  showLegalText: boolean;
  signatureText: string;
  showSignature: boolean;
  closingText: string;
  showClosingText: boolean;
  footerAlignment: TextAlignment;
  footerSeparator: boolean;
  /** Nom complet du signataire, en gras sous l'espace de signature et de cachet. */
  signatureName: string;
}

export interface InvoiceAppearance {
  template: InvoiceTemplate;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  dateFormat: InvoiceDateFormat;
  currencyLabel: InvoiceCurrency;
  thousandsSeparator: ThousandsSeparator;
  decimals: 0 | 2;
  showLineNumber: boolean;
  showSku: boolean;
  showDiscountColumn: boolean;
  showAmountInWords: boolean;
  showPageNumbers: boolean;
  pageFooterText: string;
  showPageFooterText: boolean;
  /** Alignement des intitulés et des colonnes de chiffres du tableau des produits. */
  tableHeaderAlignment: TableHeaderAlignment;
  /** Police de tout le document (écran, impression, PDF). */
  fontFamily: InvoiceFont;
  /** Montant reçu du client et monnaie rendue sur la facture (ventes en espèces). */
  showCashTender: boolean;
}

export interface InvoiceSettings {
  company: InvoiceCompany;
  header: InvoiceHeader;
  footer: InvoiceFooter;
  appearance: InvoiceAppearance;
}

export interface InvoiceLogoInfo {
  contentType: 'image/png' | 'image/jpeg';
  sizeBytes: number;
  width: number;
  height: number;
  /** Change à chaque nouveau logo. */
  sha256: string;
  updatedAt: string;
}

export interface InvoiceSettingsResponse extends InvoiceSettings {
  logo: InvoiceLogoInfo | null;
  updatedAt: string;
}

/** Valeurs d'une installation neuve (identiques au backend, migration V035). */
export function defaultInvoiceSettings(): InvoiceSettings {
  return {
    company: {
      companyName: '',
      legalName: '',
      slogan: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      email: '',
      website: '',
      registrationNumber: '',
      taxId: ''
    },
    header: {
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
      logoPosition: 'LEFT',
      headerAlignment: 'RIGHT',
      headerSeparator: true,
      headerNote: ''
    },
    footer: {
      thankYouMessage: 'Merci pour votre confiance !',
      showThankYou: true,
      salesTerms: '',
      showSalesTerms: true,
      returnPolicy: '',
      showReturnPolicy: true,
      paymentTerms: '',
      showPaymentTerms: true,
      paymentDetails: '',
      showPaymentDetails: true,
      promoMessage: '',
      showPromoMessage: true,
      legalText: '',
      showLegalText: true,
      signatureText: '',
      showSignature: true,
      closingText: '',
      showClosingText: true,
      footerAlignment: 'CENTER',
      footerSeparator: true,
      signatureName: ''
    },
    appearance: {
      template: 'MODERN',
      primaryColor: '#1E3A8A',
      secondaryColor: '#F59E0B',
      textColor: '#1F2937',
      dateFormat: 'dd/MM/yyyy',
      currencyLabel: 'FCFA',
      thousandsSeparator: 'SPACE',
      decimals: 0,
      showLineNumber: true,
      showSku: true,
      showDiscountColumn: true,
      showAmountInWords: true,
      showPageNumbers: true,
      pageFooterText: '',
      showPageFooterText: true,
      tableHeaderAlignment: 'CENTER',
      fontFamily: 'MODEL',
      showCashTender: true
    }
  };
}

/** Copie profonde (les sections ne contiennent que des valeurs simples). */
export function cloneInvoiceSettings(s: InvoiceSettings): InvoiceSettings {
  return {
    company: { ...s.company },
    header: { ...s.header },
    footer: { ...s.footer },
    appearance: { ...s.appearance }
  };
}

/** Partie configurable d'une réponse du serveur (sans logo ni date). */
export function settingsOf(r: InvoiceSettingsResponse): InvoiceSettings {
  return cloneInvoiceSettings(r);
}
