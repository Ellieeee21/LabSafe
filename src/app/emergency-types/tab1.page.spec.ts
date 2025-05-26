import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmergencyTypesPage } from './emergency-types.page';

describe('EmergencyTypesPage', () => {
  let component: EmergencyTypesPage;
  let fixture: ComponentFixture<EmergencyTypesPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EmergencyTypesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});