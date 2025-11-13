import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SignInWithPasswordCredentials } from '@supabase/auth-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  signIn(credentials: SignInWithPasswordCredentials): Observable<any> {
    return from(this.supabaseService.supabase.auth.signInWithPassword(credentials));
  }

  getSession() {
    return this.supabaseService.supabase.auth.getSession();
  }

  signOut(): Observable<{ error: any }> {
    return from(this.supabaseService.supabase.auth.signOut());
  }

  sendPasswordResetEmail(email: string): Observable<{ data: any; error: any }> {
    return from(this.supabaseService.supabase.auth.resetPasswordForEmail(email));
  }
}