import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSmtpConfigComponent } from './add-smtp-config.component';

describe('AddSmtpConfigComponent', () => {
  let component: AddSmtpConfigComponent;
  let fixture: ComponentFixture<AddSmtpConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSmtpConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSmtpConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
