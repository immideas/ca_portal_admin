import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSmsTemplateComponent } from './manage-sms-template.component';

describe('ManageSmsTemplateComponent', () => {
  let component: ManageSmsTemplateComponent;
  let fixture: ComponentFixture<ManageSmsTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageSmsTemplateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSmsTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
