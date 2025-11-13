import { TestBed } from '@angular/core/testing';

import { SupbaseService } from './supbase.service';

describe('SupbaseService', () => {
  let service: SupbaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupbaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
