import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddWhatsappTemplateComponent } from './add-whatsapp-template.component';

describe('AddWhatsappTemplateComponent', () => {
  let component: AddWhatsappTemplateComponent;
  let fixture: ComponentFixture<AddWhatsappTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddWhatsappTemplateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddWhatsappTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
