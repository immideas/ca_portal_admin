import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAdminPermissionsComponent } from './manage-admin-permissions.component';

describe('ManageAdminPermissionsComponent', () => {
  let component: ManageAdminPermissionsComponent;
  let fixture: ComponentFixture<ManageAdminPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAdminPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAdminPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
