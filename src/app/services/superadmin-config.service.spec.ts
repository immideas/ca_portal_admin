import { TestBed } from '@angular/core/testing';

import { SuperadminConfigService } from './superadmin-config.service';

describe('SuperadminConfigService', () => {
  let service: SuperadminConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuperadminConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
