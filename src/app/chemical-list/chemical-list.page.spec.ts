import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChemicalListPage } from './chemical-list.page';

describe('ChemicalListPage', () => {
  let component: ChemicalListPage;
  let fixture: ComponentFixture<ChemicalListPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ChemicalListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});