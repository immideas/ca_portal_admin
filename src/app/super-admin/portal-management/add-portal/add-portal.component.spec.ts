import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPortalComponent } from './add-portal.component';

describe('AddPortalComponent', () => {
  let component: AddPortalComponent;
  let fixture: ComponentFixture<AddPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPortalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
