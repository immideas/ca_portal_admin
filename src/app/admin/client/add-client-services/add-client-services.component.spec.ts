import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddClientServicesComponent } from './add-client-services.component';

describe('AddClientServicesComponent', () => {
  let component: AddClientServicesComponent;
  let fixture: ComponentFixture<AddClientServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddClientServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddClientServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
