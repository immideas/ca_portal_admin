import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentRequestListComponent } from './document-request-list.component';

describe('DocumentRequestListComponent', () => {
  let component: DocumentRequestListComponent;
  let fixture: ComponentFixture<DocumentRequestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentRequestListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentRequestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
