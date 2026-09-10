import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSubCategoryComponent } from './manage-sub-category.component';

describe('ManageSubCategoryComponent', () => {
  let component: ManageSubCategoryComponent;
  let fixture: ComponentFixture<ManageSubCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageSubCategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSubCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
