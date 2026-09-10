import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAdminUsersComponent } from './manage-admin-users.component';

describe('ManageAdminUsersComponent', () => {
  let component: ManageAdminUsersComponent;
  let fixture: ComponentFixture<ManageAdminUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAdminUsersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
