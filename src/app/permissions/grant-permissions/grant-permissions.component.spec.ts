import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrantPermissionsComponent } from './grant-permissions.component';

describe('GrantPermissionsComponent', () => {
  let component: GrantPermissionsComponent;
  let fixture: ComponentFixture<GrantPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrantPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrantPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
