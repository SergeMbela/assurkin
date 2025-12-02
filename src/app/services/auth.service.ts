import { Injectable, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { from, Observable, BehaviorSubject, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { SignInWithPasswordCredentials, AuthChangeEvent, Session, User, Subscription as SupabaseSubscription } from '@supabase/auth-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private _currentUser$ = new BehaviorSubject<User | null>(null);
  public currentUser$ = this._currentUser$.asObservable();
  public isAuthenticated = toSignal(this.currentUser$.pipe(map(user => !!user)), { initialValue: false });
  private authSubscription: SupabaseSubscription | null = null;

  constructor(private supabaseService: SupabaseService) {
    if (isPlatformBrowser(this.platformId)) {
      // Get initial session state
      this.supabaseService.supabase.auth.getSession().then(({ data }) => {
        this._currentUser$.next(data.session?.user ?? null);
      });
  
      // Listen for auth state changes
      const { data: { subscription } } = this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
        this._currentUser$.next(session?.user ?? null);
      });
      this.authSubscription = subscription;
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
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