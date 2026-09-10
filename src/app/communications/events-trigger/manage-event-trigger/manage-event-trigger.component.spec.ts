import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageEventTriggerComponent } from './manage-event-trigger.component';

describe('ManageEventTriggerComponent', () => {
  let component: ManageEventTriggerComponent;
  let fixture: ComponentFixture<ManageEventTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageEventTriggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageEventTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
