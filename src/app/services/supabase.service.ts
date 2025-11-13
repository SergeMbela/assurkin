import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  insertData(table: string, data: any) {
    return this.supabase
      .from(table)
      .insert([data]);
  }

  fetchData(table: string, query: string) {
    return this.supabase
      .from(table)
      .select(query);
  }
}
