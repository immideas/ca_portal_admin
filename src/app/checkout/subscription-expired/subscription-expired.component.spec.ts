import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionExpiredComponent } from './subscription-expired.component';

describe('SubscriptionExpiredComponent', () => {
  let component: SubscriptionExpiredComponent;
  let fixture: ComponentFixture<SubscriptionExpiredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionExpiredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionExpiredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
