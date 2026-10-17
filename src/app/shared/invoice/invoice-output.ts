import { InvoiceAppearance } from '../../core/models/invoice-settings.model';

/** Marges de la page imprimée ou exportée (pt : 1 mm ≈ 2,83 pt). */
const PDF_MARGIN = { top: 28, right: 28, bottom: 40, left: 28 };

/** Texte sûr dans une chaîne CSS (`content: "…"`). */
function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
}

/** Feuilles de style de la page (dont celles de la facture), recopiées dans la fenêtre d'impression. */
function documentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');
}

/** Règles de page : marges, numéros de page et mention de bas de page (navigateurs récents). */
function pageRules(appearance: InvoiceAppearance): string {
  const footer = appearance.showPageFooterText && appearance.pageFooterText
    ? `@bottom-left { content: ${cssString(appearance.pageFooterText)}; font: 9px Arial, sans-serif; color: #6b7280; }`
    : '';
  const numbers = appearance.showPageNumbers
    ? '@bottom-right { content: "Page " counter(page) " / " counter(pages); font: 9px Arial, sans-serif; color: #6b7280; }'
    : '';
  return `@page { size: A4; margin: 10mm 10mm 14mm; ${footer} ${numbers} }
    html, body { margin: 0; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .gsi { max-width: none; padding: 0; }
    .gsi-lines-wrap { overflow: visible; }
    .gsi-lines { min-width: 0; }
    .gsi-sample, .gsi-page-footer { display: none !important; }`;
}

/**
 * Imprime la facture seule, dans une fenêtre d'impression dédiée (cadre invisible) : le reste
 * de l'application n'est pas imprimé. Se résout quand la boîte d'impression est fermée.
 */
export function printInvoice(element: HTMLElement, appearance: InvoiceAppearance, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      reject(new Error('Impression impossible dans ce navigateur.'));
      return;
    }

    const safeTitle = title.replace(/[<>&"]/g, '');
    doc.open();
    doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${safeTitle}</title>
      ${documentStyles()}<style>${pageRules(appearance)}</style></head>
      <body>${element.outerHTML}</body></html>`);
    doc.close();

    const cleanup = () => {
      frame.remove();
      resolve();
    };

    const images = Array.from(doc.images);
    const ready = Promise.all(
      images.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => (img.onload = img.onerror = () => r()))))
    );
    // Laisse aussi le temps aux feuilles de style recopiées (<link>) de se charger.
    const loaded = new Promise<void>((r) => (doc.readyState === 'complete' ? r() : (frame.onload = () => r())));

    Promise.all([ready, loaded]).then(() => {
      win.addEventListener('afterprint', () => setTimeout(cleanup, 0), { once: true });
      win.focus();
      win.print();
      // Navigateurs sans « afterprint » sur un cadre : nettoyage différé.
      setTimeout(() => {
        if (document.body.contains(frame)) cleanup();
      }, 60_000);
    });
  });
}

/**
 * PDF A4 de la facture telle qu'affichée (mise en page, couleurs, logo), avec numéros de page
 * et mention de bas de page si la configuration les demande.
 */
export async function exportInvoicePdf(
  element: HTMLElement,
  appearance: InvoiceAppearance,
  fileName: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN.left - PDF_MARGIN.right;

  // Copie hors écran à la largeur d'une page : le rendu ne dépend pas de la taille de la fenêtre.
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.gsi-sample, .gsi-page-footer').forEach((n) => n.remove());
  clone.style.maxWidth = '794px';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    await new Promise<void>((resolve, reject) => {
      pdf
        .html(clone, {
          x: PDF_MARGIN.left,
          y: PDF_MARGIN.top,
          width: contentWidth,
          windowWidth: 794,
          margin: [PDF_MARGIN.top, PDF_MARGIN.right, PDF_MARGIN.bottom, PDF_MARGIN.left],
          autoPaging: 'text',
          html2canvas: { useCORS: false, backgroundColor: '#ffffff' },
          callback: () => resolve()
        })
        .catch(reject);
    });

    const pages = pdf.getNumberOfPages();
    const footer = appearance.showPageFooterText ? appearance.pageFooterText : '';
    if (footer || appearance.showPageNumbers) {
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        const y = pageHeight - 18;
        if (footer) {
          const text = pdf.splitTextToSize(footer, contentWidth - 80)[0] as string;
          pdf.text(text, PDF_MARGIN.left, y);
        }
        if (appearance.showPageNumbers) {
          pdf.text(`Page ${i} / ${pages}`, pageWidth - PDF_MARGIN.right, y, { align: 'right' });
        }
      }
    }

    pdf.save(fileName);
  } finally {
    holder.remove();
  }
}
