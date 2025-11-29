import { TestBed } from '@angular/core/testing';

import { ImatService } from './imat.service';

describe('ImatService', () => {
  let service: ImatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
