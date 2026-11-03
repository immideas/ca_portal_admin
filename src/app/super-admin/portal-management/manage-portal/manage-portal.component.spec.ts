import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePortalComponent } from './manage-portal.component';

describe('ManagePortalComponent', () => {
  let component: ManagePortalComponent;
  let fixture: ComponentFixture<ManagePortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagePortalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagePortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
