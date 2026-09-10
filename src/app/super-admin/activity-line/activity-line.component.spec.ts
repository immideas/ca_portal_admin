import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityLineComponent } from './activity-line.component';

describe('ActivityLineComponent', () => {
  let component: ActivityLineComponent;
  let fixture: ComponentFixture<ActivityLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityLineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
