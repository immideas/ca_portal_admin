import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordResetRequestsComponent } from './password-reset-requests.component';

describe('PasswordResetRequestsComponent', () => {
  let component: PasswordResetRequestsComponent;
  let fixture: ComponentFixture<PasswordResetRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordResetRequestsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordResetRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
