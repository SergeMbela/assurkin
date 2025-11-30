import { Injectable, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { from, Observable, BehaviorSubject, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { SignInWithPasswordCredentials, AuthChangeEvent, Session, User } from '@supabase/auth-js';
import { SupabaseService } from './supabase.service';

export interface AuthState {
  event: AuthChangeEvent | null;
  session: Session | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private authStateSubject = new BehaviorSubject<AuthState>({ event: null, session: null });
  public authState$ = this.authStateSubject.asObservable();
  public currentUser$: Observable<User | null> = this.authState$.pipe(map(state => state.session?.user ?? null));
  private authSubscription: { data: { subscription: any } } | null = null;

  constructor(private supabaseService: SupabaseService) {
    if (isPlatformBrowser(this.platformId)) {
      // Get initial session state
      this.supabaseService.supabase.auth.getSession().then(({ data }) => {
        this.authStateSubject.next({ event: 'INITIAL_SESSION', session: data.session });
      });
  
      // Listen for auth state changes
      this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
        this.authStateSubject.next({ event, session });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.data.subscription.unsubscribe();
    }
  }

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