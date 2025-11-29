import { TestBed } from '@angular/core/testing';

import { AssuranceMapperService } from './assurance-mapper.service';

describe('AssuranceMapperService', () => {
  let service: AssuranceMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssuranceMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
