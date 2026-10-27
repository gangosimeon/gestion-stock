import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProductImagesService, UPLOAD_MAX_BYTES } from './product-images.service';

const URL_P1 = `${environment.apiUrl}/products/p1/image`;

describe('ProductImagesService (photos des produits)', () => {
  let http: HttpTestingController;
  let service: ProductImagesService;
  let created = 0;

  beforeEach(() => {
    created = 0;
    // jsdom : URL locales simulées.
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => `blob:local/${++created}`;
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => undefined;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProductImagesService);
  });

  afterEach(() => http.verify());

  it('sans photo : aucune requête', async () => {
    expect(await firstValueFrom(service.url('p1', null))).toBeNull();
    http.expectNone(URL_P1);
  });

  it('photo lue une seule fois par version (authentifiée, puis gardée en mémoire)', async () => {
    const first = firstValueFrom(service.url('p1', 'v1'));
    const second = firstValueFrom(service.url('p1', 'v1'));
    const req = http.expectOne(URL_P1);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['jpeg']));

    expect(await first).toBe('blob:local/1');
    expect(await second).toBe('blob:local/1');
    // Nouvelle version : nouvelle lecture.
    const third = firstValueFrom(service.url('p1', 'v2'));
    http.expectOne(URL_P1).flush(new Blob(['autre']));
    expect(await third).toBe('blob:local/2');
  });

  it('photo illisible : pictogramme (null), sans erreur', async () => {
    const url = firstValueFrom(service.url('p1', 'v1'));
    http.expectOne(URL_P1).flush(null, { status: 404, statusText: 'Not Found' });
    expect(await url).toBeNull();
  });

  it('envoi en multipart (champ « file ») puis relecture de la nouvelle photo', async () => {
    const before = firstValueFrom(service.url('p1', 'v1'));
    http.expectOne(URL_P1).flush(new Blob(['ancienne']));
    await before;

    const sent = firstValueFrom(service.upload('p1', new Blob(['photo'], { type: 'image/jpeg' })));
    const put = http.expectOne(URL_P1);
    expect(put.request.method).toBe('PUT');
    expect((put.request.body as FormData).get('file')).toBeInstanceOf(Blob);
    put.flush({ productId: 'p1', contentType: 'image/jpeg', sizeBytes: 100, width: 512, height: 341, version: 'v2' });
    expect((await sent).version).toBe('v2');

    // L'ancienne version n'est plus servie depuis la mémoire.
    const again = firstValueFrom(service.url('p1', 'v1'));
    http.expectOne(URL_P1).flush(new Blob(['x']));
    await again;
  });

  it('message du serveur repris en cas de refus', async () => {
    const sent = firstValueFrom(service.upload('p1', new Blob(['x'])));
    http.expectOne(URL_P1).flush({ message: 'Format non reconnu : choisissez une photo JPEG ou PNG.' }, { status: 400, statusText: 'Bad Request' });
    await expect(sent).rejects.toThrow('Format non reconnu');
  });

  it('préparation : autre chose qu’une image refusée ; sans réduction possible, la photo d’origine est envoyée', async () => {
    await expect(service.prepare(new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }))).rejects.toThrow('photo');

    const photo = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
    expect(await service.prepare(photo)).toBe(photo);

    const heavy = new File([new Uint8Array(UPLOAD_MAX_BYTES + 1)], 'lourde.jpg', { type: 'image/jpeg' });
    await expect(service.prepare(heavy)).rejects.toThrow('8 Mo');
  });
});
