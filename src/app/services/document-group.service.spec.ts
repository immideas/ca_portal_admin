import { TestBed } from '@angular/core/testing';

import { DocumentGroupService } from './document-group.service';

describe('DocumentGroupService', () => {
  let service: DocumentGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
