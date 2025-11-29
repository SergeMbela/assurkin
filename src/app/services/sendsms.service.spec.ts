import { TestBed } from '@angular/core/testing';

import { SendsmsService } from './sendsms.service';

describe('SendsmsService', () => {
  let service: SendsmsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SendsmsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
