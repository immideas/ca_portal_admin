import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSubadminPermissionsComponent } from './manage-subadmin-permissions.component';

describe('ManageSubadminPermissionsComponent', () => {
  let component: ManageSubadminPermissionsComponent;
  let fixture: ComponentFixture<ManageSubadminPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageSubadminPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSubadminPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
