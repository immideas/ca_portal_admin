import { TestBed } from '@angular/core/testing';

import { PayoutSettingService } from './payout-setting.service';

describe('PayoutSettingService', () => {
  let service: PayoutSettingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PayoutSettingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
