import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageWhatsappTemplateComponent } from './manage-whatsapp-template.component';

describe('ManageWhatsappTemplateComponent', () => {
  let component: ManageWhatsappTemplateComponent;
  let fixture: ComponentFixture<ManageWhatsappTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageWhatsappTemplateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageWhatsappTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
