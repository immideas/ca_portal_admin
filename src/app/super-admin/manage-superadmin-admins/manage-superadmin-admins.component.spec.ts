import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSuperadminAdminsComponent } from './manage-superadmin-admins.component';

describe('ManageSuperadminAdminsComponent', () => {
  let component: ManageSuperadminAdminsComponent;
  let fixture: ComponentFixture<ManageSuperadminAdminsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageSuperadminAdminsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSuperadminAdminsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
