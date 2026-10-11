import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { Customer } from '../../../core/models/customer.model';
import { ClientDrawerComponent } from '../ui/client-drawer.component';
import { ClientsFacade } from './clients.facade';
import { ClientsVm } from './clients-vm.model';

const API = environment.apiUrl;

const CLIENT: Customer = {
  id: '2b9d1f00-0000-4000-8000-000000000001',
  code: 'CLI-000001',
  name: 'Clinique Vision Plus',
  creditLimit: 500000,
  balance: 120000,
  availableCredit: 380000
};

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'mock-token::admin');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'caisse.test', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions })
  );
}

describe('ClientsFacade (écrans Clients sur Spring Boot)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ClientDrawerComponent],
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor, mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
  });

  afterEach(() => http.verify());

  function init(permissions: string[]): ClientsFacade {
    signedIn(permissions);
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(ClientsFacade);
  }

  function nextVm(facade: ClientsFacade, predicate: (vm: ClientsVm) => boolean): Promise<ClientsVm> {
    return firstValueFrom((facade.vm$ as Observable<ClientsVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  it('liste servie par le backend (dette incluse), droits issus des permissions', async () => {
    const facade = init(['customer:read', 'customer:create', 'customer:update', 'customer:pay']);
    const vm = nextVm(facade, (v) => v.customers.length > 0);
    facade.refresh();
    http.expectOne(`${API}/customers`).flush({ items: [CLIENT], total: 1 });
    const loaded = await vm;

    expect(loaded.customers[0].balance).toBe(120000);
    expect(loaded).toMatchObject({ canCreate: true, canUpdate: true, canDelete: false, canCredit: false });
  });

  it('écran Ventes compris : /api/customers ne passe plus jamais par le mock', () => {
    init([]);
    TestBed.inject(HttpClient).get(`${API}/customers`).subscribe();
    http.expectOne(`${API}/customers`).flush({ items: [], total: 0 });
  });

  it('sans customer:credit : plafond verrouillé et absent de la requête (conservé par le backend)', () => {
    init(['customer:read', 'customer:update']);
    const fixture = TestBed.createComponent(ClientDrawerComponent);
    const drawer = fixture.componentInstance;
    drawer.ctx = { mode: 'EDIT', customerId: CLIENT.id, customers: [CLIENT], canCredit: false };
    drawer.ngOnChanges();
    fixture.detectChanges();
    expect(drawer.form.controls.creditLimit.disabled).toBe(true);

    drawer.form.patchValue({ name: 'Clinique Vision Plus (Cocody)' });
    drawer.submit();
    const patch = http.expectOne(`${API}/customers/${CLIENT.id}`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ name: 'Clinique Vision Plus (Cocody)', phone: undefined, email: undefined });
    patch.flush({ ...CLIENT, name: 'Clinique Vision Plus (Cocody)' });
    // Rechargement de la liste après enregistrement.
    http.expectOne(`${API}/customers`).flush({ items: [CLIENT], total: 1 });
  });

  it('avec customer:credit : le plafond est envoyé', () => {
    init(['customer:read', 'customer:update', 'customer:credit']);
    const fixture = TestBed.createComponent(ClientDrawerComponent);
    const drawer = fixture.componentInstance;
    drawer.ctx = { mode: 'EDIT', customerId: CLIENT.id, customers: [CLIENT], canCredit: true };
    drawer.ngOnChanges();
    drawer.form.patchValue({ creditLimit: 800000 });
    drawer.submit();
    const patch = http.expectOne(`${API}/customers/${CLIENT.id}`);
    expect(patch.request.body).toMatchObject({ creditLimit: 800000 });
    patch.flush(CLIENT);
    http.expectOne(`${API}/customers`).flush({ items: [CLIENT], total: 1 });
  });
});
