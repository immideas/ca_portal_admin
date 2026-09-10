import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { paymentStatusGuard } from './payment-status.guard';

describe('paymentStatusGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => paymentStatusGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
