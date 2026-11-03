import { TestBed } from '@angular/core/testing';

import { CredentailVaultService } from './credentail-vault.service';

describe('CredentailVaultService', () => {
  let service: CredentailVaultService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentailVaultService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
