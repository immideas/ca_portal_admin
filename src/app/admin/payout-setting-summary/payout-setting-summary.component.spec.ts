import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayoutSettingSummaryComponent } from './payout-setting-summary.component';

describe('PayoutSettingSummaryComponent', () => {
  let component: PayoutSettingSummaryComponent;
  let fixture: ComponentFixture<PayoutSettingSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutSettingSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayoutSettingSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
