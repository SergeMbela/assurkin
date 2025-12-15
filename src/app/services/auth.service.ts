import { Injectable, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { from, Observable, BehaviorSubject, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { SignInWithPasswordCredentials, AuthChangeEvent, Session, User, Subscription as SupabaseSubscription } from '@supabase/auth-js';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

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
    // Détermine l'URL de redirection (navigateur ou fallback sur l'environnement)
    const redirectTo = isPlatformBrowser(this.platformId) 
      ? `${window.location.origin}/update-password` 
      : `${environment.website}/update-password`;

    // Appel de l'Edge Function 'reset-password-email' qui utilise SendGrid
    return from(this.supabaseService.supabase.functions.invoke('reset-password-email', {
      body: { email, redirectTo }
    })).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur Edge Function détaillée:', response.error);
        }
        return response;
      })
    );
  }

  updatePassword(password: string): Observable<{ data: any; error: any }> {
    return from(this.supabaseService.supabase.auth.updateUser({ password }));
  }
}