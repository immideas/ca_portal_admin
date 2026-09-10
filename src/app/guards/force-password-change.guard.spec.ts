import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { forcePasswordChangeGuard } from './force-password-change.guard';

describe('forcePasswordChangeGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => forcePasswordChangeGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
