import { TestBed } from '@angular/core/testing';

import { SupabaseUpdateService } from './supabase-update.service';

describe('SupabaseUpdateService', () => {
  let service: SupabaseUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
