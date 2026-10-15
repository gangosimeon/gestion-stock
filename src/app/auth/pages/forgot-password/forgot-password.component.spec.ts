import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent (affichage)', () => {
  it('rend le champ Material, son icône et le bouton d’envoi (aucune animation non déclarée)', () => {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideAnimations()]
    });
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('mat-form-field.mat-mdc-form-field')).not.toBeNull();
    expect(root.querySelector('input.mat-mdc-input-element[formcontrolname="email"]')).not.toBeNull();
    expect(root.querySelector('.forgot-icon mat-icon.mat-icon')).not.toBeNull();
    expect(root.querySelector('button[type="submit"]')).not.toBeNull();
  });
});
