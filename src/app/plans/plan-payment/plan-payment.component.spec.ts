import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanPaymentComponent } from './plan-payment.component';

describe('PlanPaymentComponent', () => {
  let component: PlanPaymentComponent;
  let fixture: ComponentFixture<PlanPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanPaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
