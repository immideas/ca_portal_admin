import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddClientGroupComponent } from './add-client-group.component';

describe('AddClientGroupComponent', () => {
  let component: AddClientGroupComponent;
  let fixture: ComponentFixture<AddClientGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddClientGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddClientGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
