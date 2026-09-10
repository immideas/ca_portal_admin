import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEventTriggerComponent } from './add-event-trigger.component';

describe('AddEventTriggerComponent', () => {
  let component: AddEventTriggerComponent;
  let fixture: ComponentFixture<AddEventTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEventTriggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEventTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
