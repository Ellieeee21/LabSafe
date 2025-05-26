import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmergencyStepsPage } from './emergency-steps.page';

describe('EmergencyStepsPage', () => {
  let component: EmergencyStepsPage;
  let fixture: ComponentFixture<EmergencyStepsPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EmergencyStepsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});