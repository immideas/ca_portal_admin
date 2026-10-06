import { TestBed } from '@angular/core/testing';

import { AdminConfigService } from './admin-config.service';

describe('AdminConfigService', () => {
  let service: AdminConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
