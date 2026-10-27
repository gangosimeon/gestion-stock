import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { ProductPhotoComponent } from './product-photo.component';

const URL_P1 = `${environment.apiUrl}/products/p1/image`;

/** Attend la fin des traitements asynchrones (préparation de la photo, envoi). */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function pick(fixture: { nativeElement: HTMLElement }, file: File): void {
  const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

describe('ProductPhotoComponent (photo facultative dans la fiche produit)', () => {
  let http: HttpTestingController;

  function setup(inputs: { productId: string | null; version?: string | null; editable?: boolean }) {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => 'blob:local/apercu';
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => undefined;
    TestBed.configureTestingModule({
      imports: [ProductPhotoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProductPhotoComponent);
    fixture.componentRef.setInput('productId', inputs.productId);
    fixture.componentRef.setInput('version', inputs.version ?? null);
    fixture.componentRef.setInput('editable', inputs.editable ?? true);
    const changes: (string | null)[] = [];
    fixture.componentInstance.changed.subscribe((v) => changes.push(v));
    fixture.detectChanges();
    const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    return { fixture, component: fixture.componentInstance, changes, text };
  }

  afterEach(() => http.verify());

  it('produit sans photo : « Ajouter une photo », envoi immédiat, nouvelle version annoncée', async () => {
    const { fixture, changes, text } = setup({ productId: 'p1' });
    expect(text()).toContain('Ajouter une photo');
    expect(text()).toContain('(facultative)');

    pick(fixture, new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' }));
    await tick();
    const put = http.expectOne(URL_P1);
    expect(put.request.method).toBe('PUT');
    put.flush({ productId: 'p1', contentType: 'image/jpeg', sizeBytes: 100, width: 512, height: 341, version: 'v2' });
    await tick();
    // Vignette rechargée pour la nouvelle version.
    fixture.detectChanges();
    http.expectOne(URL_P1).flush(new Blob(['jpeg']));
    fixture.detectChanges();

    expect(changes).toEqual(['v2']);
    expect(text()).toContain('Changer');
    expect(text()).toContain('Retirer');
  });

  it('retrait de la photo', async () => {
    const { fixture, component, changes } = setup({ productId: 'p1', version: 'v1' });
    http.expectOne(URL_P1).flush(new Blob(['jpeg']));

    void component.remove();
    const del = http.expectOne(URL_P1);
    expect(del.request.method).toBe('DELETE');
    del.flush({ ok: true });
    await tick();
    fixture.detectChanges();

    expect(changes).toEqual([null]);
  });

  it('nouveau produit : la photo choisie attend l’enregistrement de la fiche, puis est envoyée', async () => {
    const { fixture, component, text } = setup({ productId: null });
    pick(fixture, new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' }));
    await tick();
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(text()).toContain('La photo sera enregistrée avec le produit.');

    const done = component.uploadPending('p1');
    await tick();
    http.expectOne(URL_P1).flush({ productId: 'p1', contentType: 'image/jpeg', sizeBytes: 1, width: 1, height: 1, version: 'v1' });
    expect(await done).toBe(true);
  });

  it('fichier refusé : message affiché, rien n’est envoyé', async () => {
    const { fixture, text } = setup({ productId: 'p1' });
    pick(fixture, new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }));
    await tick();
    fixture.detectChanges();

    expect(text()).toContain('Choisissez une photo');
    http.expectNone(URL_P1);
  });

  it('lecture seule : aucune action de modification', () => {
    const { text } = setup({ productId: 'p1', editable: false });
    expect(text()).not.toContain('Ajouter une photo');
    expect(text()).not.toContain('Retirer');
  });
});
