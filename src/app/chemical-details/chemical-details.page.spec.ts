import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChemicalDetailsPage } from './chemical-details.page';

describe('ChemicalDetailsPage', () => {
  let component: ChemicalDetailsPage;
  let fixture: ComponentFixture<ChemicalDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChemicalDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});