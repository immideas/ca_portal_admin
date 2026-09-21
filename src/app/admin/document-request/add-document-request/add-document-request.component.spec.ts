import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDocumentRequestComponent } from './add-document-request.component';

describe('AddDocumentRequestComponent', () => {
  let component: AddDocumentRequestComponent;
  let fixture: ComponentFixture<AddDocumentRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDocumentRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddDocumentRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
