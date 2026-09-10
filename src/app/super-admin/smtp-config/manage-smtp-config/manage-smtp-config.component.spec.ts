import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSmtpConfigComponent } from './manage-smtp-config.component';

describe('ManageSmtpConfigComponent', () => {
  let component: ManageSmtpConfigComponent;
  let fixture: ComponentFixture<ManageSmtpConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageSmtpConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSmtpConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
