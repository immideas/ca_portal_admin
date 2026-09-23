import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDocumentGroupComponent } from './add-document-group.component';

describe('AddDocumentGroupComponent', () => {
  let component: AddDocumentGroupComponent;
  let fixture: ComponentFixture<AddDocumentGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDocumentGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddDocumentGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
