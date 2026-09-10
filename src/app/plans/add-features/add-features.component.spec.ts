import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddFeaturesComponent } from './add-features.component';

describe('AddFeaturesComponent', () => {
  let component: AddFeaturesComponent;
  let fixture: ComponentFixture<AddFeaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddFeaturesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddFeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
