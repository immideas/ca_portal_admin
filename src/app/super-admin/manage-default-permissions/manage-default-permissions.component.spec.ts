import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageDefaultPermissionsComponent } from './manage-default-permissions.component';

describe('ManageDefaultPermissionsComponent', () => {
  let component: ManageDefaultPermissionsComponent;
  let fixture: ComponentFixture<ManageDefaultPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDefaultPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageDefaultPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
