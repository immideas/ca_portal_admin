import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanPaymentHistoryComponent } from './plan-payment-history.component';

describe('PlanPaymentHistoryComponent', () => {
  let component: PlanPaymentHistoryComponent;
  let fixture: ComponentFixture<PlanPaymentHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanPaymentHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanPaymentHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
