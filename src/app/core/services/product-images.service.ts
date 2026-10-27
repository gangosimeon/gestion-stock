import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Photo enregistrée (après réduction par le serveur). */
export interface ProductImageInfo {
  productId: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  /** Empreinte : devient `imageVersion` du produit. */
  version: string;
}

/** Plus grand côté de la photo envoyée (le serveur la réduit encore à 512 px). */
export const UPLOAD_MAX_SIDE = 1024;

/** Taille maximale acceptée par le serveur. */
export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

function toApiError(err: unknown): Error {
  if (err instanceof HttpErrorResponse) {
    const msg = typeof err.error === 'string' ? err.error : (err.error?.message as string | undefined);
    return new Error(msg ?? 'Envoi de la photo impossible.');
  }
  return err instanceof Error ? err : new Error('Une erreur est survenue.');
}

/**
 * Photos des produits. Lecture authentifiée (une balise <img> n'envoie pas le jeton) : l'image est
 * chargée par HttpClient puis affichée par une URL locale, gardée en mémoire par version (une nouvelle
 * photo change de version, donc d'entrée). Envoi : photo réduite sur l'appareil avant l'envoi, pour
 * économiser les données mobiles ; le serveur la vérifie et la ré-encode de toute façon.
 */
@Injectable({ providedIn: 'root' })
export class ProductImagesService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<string | null>>();

  /** URL affichable de la photo ; null sans photo ou si elle ne peut pas être lue. */
  url(productId: string, version: string | null | undefined): Observable<string | null> {
    if (!version) return of(null);
    const key = `${productId}:${version}`;
    let url$ = this.cache.get(key);
    if (!url$) {
      url$ = this.http.get(this.endpoint(productId), { responseType: 'blob' }).pipe(
        map((blob) => URL.createObjectURL(blob)),
        catchError(() => of(null)),
        shareReplay(1)
      );
      this.cache.set(key, url$);
    }
    return url$;
  }

  upload(productId: string, photo: Blob): Observable<ProductImageInfo> {
    const body = new FormData();
    body.append('file', photo, 'photo.jpg');
    return this.http.put<ProductImageInfo>(this.endpoint(productId), body).pipe(
      tap(() => this.forget(productId)),
      catchError((e: unknown) => throwError(() => toApiError(e)))
    );
  }

  remove(productId: string): Observable<void> {
    return this.http.delete(this.endpoint(productId)).pipe(
      map(() => undefined),
      tap(() => this.forget(productId)),
      catchError((e: unknown) => throwError(() => toApiError(e)))
    );
  }

  /**
   * Photo prête à l'envoi : réduite à {@link UPLOAD_MAX_SIDE} px en JPEG, orientation du téléphone
   * appliquée. Si le navigateur ne sait pas la réduire, la photo d'origine est envoyée telle quelle
   * (le serveur la réduit). Refus immédiat de ce qui n'est pas une image ou dépasse 8 Mo.
   */
  async prepare(file: File): Promise<Blob> {
    if (file.type && !file.type.startsWith('image/')) {
      throw new Error('Choisissez une photo (JPEG ou PNG).');
    }
    try {
      const reduced = await reduceImage(file, UPLOAD_MAX_SIDE);
      if (reduced) return reduced;
    } catch {
      // Navigateur ancien ou format non décodable ici : le serveur décidera.
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new Error('Photo trop lourde : 8 Mo au plus.');
    }
    return file;
  }

  /** Anciennes versions retirées de la mémoire (et leurs URL locales libérées). */
  private forget(productId: string): void {
    for (const [key, url$] of this.cache) {
      if (key.startsWith(`${productId}:`)) {
        url$.subscribe((url) => url && URL.revokeObjectURL(url));
        this.cache.delete(key);
      }
    }
  }

  private endpoint(productId: string): string {
    return `${environment.apiUrl}/products/${productId}/image`;
  }
}

/** Réduction sur l'appareil (canvas) ; null si l'API n'est pas disponible. */
async function reduceImage(file: Blob, maxSide: number): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  } finally {
    bitmap.close();
  }
}
