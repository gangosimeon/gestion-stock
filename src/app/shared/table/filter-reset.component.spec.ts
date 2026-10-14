import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { FilterResetComponent } from './filter-reset.component';
import { ServerTable } from './server-table';

@Component({
  imports: [FilterResetComponent],
  template: `<app-filter-reset [table]="table" />`
})
class HostComponent {
  readonly table = new ServerTable<string>(() => of({ items: [], total: 0 }), {
    filters: new FormGroup({ status: new FormControl<string | null>('ACTIVE') })
  });
}

describe('FilterResetComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = () => fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    return { fixture, host: fixture.componentInstance, button };
  }

  it('grisé sans critère, actif dès qu’un filtre change, et remet les filtres à leur valeur de départ', () => {
    const { fixture, host, button } = setup();
    expect(button().disabled).toBe(true);
    expect(button().textContent).toContain('Réinitialiser');

    host.table.filters.setValue({ status: 'INACTIVE' });
    fixture.detectChanges();
    expect(button().disabled).toBe(false);

    button().click();
    fixture.detectChanges();
    expect(host.table.filters.getRawValue()).toEqual({ status: 'ACTIVE' });
    expect(button().disabled).toBe(true);
  });
});
