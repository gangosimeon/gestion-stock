import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { User } from '../../../core/models/user.model';
import { UsersFacade } from './users.facade';
import { UsersVm } from './users-vm.model';

const API = environment.apiUrl;

const ALICE: User = {
  id: '0b6a1c52-0000-4000-8000-000000000001',
  username: 'alice',
  fullName: 'Alice Kouamé',
  roles: ['CAISSIER'],
  isActive: true
};

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'access');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'admin-id', username: 'admin', role: 'ADMIN', roles: ['ADMIN'], permissions })
  );
}

describe('UsersFacade (API Spring Boot /api/users)', () => {
  let facade: UsersFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      // Mock global présent comme dans l'application : /api/users ne doit plus y passer.
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
  });

  afterEach(() => http.verify());

  function init(permissions: string[]): void {
    signedIn(permissions);
    facade = TestBed.inject(UsersFacade);
    http = TestBed.inject(HttpTestingController);
  }

  function nextVm(predicate: (vm: UsersVm) => boolean): Promise<UsersVm> {
    return firstValueFrom((facade.vm$ as Observable<UsersVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  it('liste servie par le backend (plus par le mock), droits issus des permissions', async () => {
    init(['user:manage']);
    const vm = nextVm((v) => v.items.length > 0);
    http.expectOne(`${API}/users`).flush({ items: [ALICE], total: 1, page: 0, size: 1, totalPages: 1 });

    const loaded = await vm;
    expect(loaded.items).toEqual([ALICE]);
    expect(loaded.canManage).toBe(true);
  });

  it("un seul GET /users quel que soit le nombre d'abonnés de l'écran", async () => {
    init(['user:manage']);
    const subscribers = [nextVm((v) => v.items.length > 0), nextVm((v) => v.items.length > 0), nextVm((v) => v.items.length > 0)];
    http.expectOne(`${API}/users`).flush({ items: [ALICE], total: 1 });
    await Promise.all(subscribers);
  });

  it('sans user:manage : lecture seule', async () => {
    init(['sale:create']);
    const vm = nextVm((v) => !v.isLoading);
    http.expectOne(`${API}/users`).flush({ items: [], total: 0 });
    expect((await vm).canManage).toBe(false);
  });

  it('refus du backend : message affiché et écran toujours alimenté', async () => {
    init(['user:manage']);
    // Abonnement permanent, comme la page ouverte.
    const screen = facade.vm$.subscribe();
    const failed = nextVm((v) => v.errorMessage !== null);
    http
      .expectOne(`${API}/users`)
      .flush({ status: 403, code: 'ACCESS_DENIED', message: 'Accès refusé.' }, { status: 403, statusText: 'Forbidden' });
    expect((await failed).errorMessage).toBe('Accès refusé.');

    // Le flux n'est pas coupé : une nouvelle demande recharge la liste.
    const recovered = nextVm((v) => v.items.length > 0);
    facade.refresh();
    http.expectOne(`${API}/users`).flush({ items: [ALICE], total: 1 });
    expect((await recovered).items).toEqual([ALICE]);
    screen.unsubscribe();
  });

  it('création : mot de passe provisoire transmis au backend', async () => {
    init(['user:manage']);
    const created = firstValueFrom(
      facade.create({
        username: 'bob',
        fullName: 'Bob Traoré',
        roles: ['CAISSIER'],
        isActive: true,
        password: 'Provisoire1'
      }) as Observable<User>
    );
    const req = http.expectOne(`${API}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'bob',
      fullName: 'Bob Traoré',
      roles: ['CAISSIER'],
      isActive: true,
      password: 'Provisoire1'
    });
    req.flush({ ...ALICE, username: 'bob' }, { status: 201, statusText: 'Created' });
    await created;
  });

  it('modification avec nouveau mot de passe : PUT puis route dédiée /password', async () => {
    init(['user:manage']);
    const updated = firstValueFrom(
      facade.update(ALICE.id, { username: 'alice', fullName: 'Alice K.', roles: ['GESTIONNAIRE'] }, 'Nouveau123') as Observable<User>
    );
    const put = http.expectOne(`${API}/users/${ALICE.id}`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ username: 'alice', fullName: 'Alice K.', roles: ['GESTIONNAIRE'] });
    put.flush({ ...ALICE, fullName: 'Alice K.' });

    const pwd = http.expectOne(`${API}/users/${ALICE.id}/password`);
    expect(pwd.request.method).toBe('PUT');
    expect(pwd.request.body).toEqual({ password: 'Nouveau123', temporary: true });
    pwd.flush(null, { status: 204, statusText: 'No Content' });
    expect((await updated).fullName).toBe('Alice K.');
  });

  it('modification sans mot de passe : aucune réinitialisation', async () => {
    init(['user:manage']);
    const updated = firstValueFrom(
      facade.update(ALICE.id, { username: 'alice', fullName: 'Alice', roles: ['CAISSIER'] }) as Observable<User>
    );
    http.expectOne(`${API}/users/${ALICE.id}`).flush(ALICE);
    await updated;
    http.expectNone(`${API}/users/${ALICE.id}/password`);
  });

  it('statut et suppression : routes dédiées, refus du backend remonté tel quel', async () => {
    init(['user:manage']);
    const toggled = firstValueFrom(facade.setActive(ALICE.id, false) as Observable<User>);
    const patch = http.expectOne(`${API}/users/${ALICE.id}/active`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ isActive: false });
    patch.flush({ ...ALICE, isActive: false });
    await toggled;

    const removed = firstValueFrom(facade.delete(ALICE.id) as Observable<unknown>).catch((e: unknown) => e);
    const del = http.expectOne(`${API}/users/${ALICE.id}`);
    expect(del.request.method).toBe('DELETE');
    del.flush(
      { status: 409, code: 'LAST_ADMIN_REQUIRED', message: 'Au moins un administrateur actif doit être conservé.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(((await removed) as Error).message).toBe('Au moins un administrateur actif doit être conservé.');
  });
});
