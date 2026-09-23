import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageDocumentGroupComponent } from './manage-document-group.component';

describe('ManageDocumentGroupComponent', () => {
  let component: ManageDocumentGroupComponent;
  let fixture: ComponentFixture<ManageDocumentGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDocumentGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageDocumentGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
