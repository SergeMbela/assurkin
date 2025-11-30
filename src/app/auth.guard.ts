import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { map, filter, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const authService = inject(AuthService);

  if (isPlatformServer(platformId)) {
    // On the server, we can't perform an async check that relies on browser cookies
    // without a more complex setup (passing request headers to HttpClient).
    // For now, we allow navigation and let the client-side guard handle redirection.
    // This prevents the SSR process from hanging.
    return true;
  }

  // Use the user$ observable from the AuthService.
  return authService.currentUser$.pipe(
    // We use filter() to wait until the initial auth check is complete.
    // `undefined` means the check is still in progress.
    filter((userState): userState is User | null => userState !== undefined),
    // We only need the first emission that is not `undefined`.
    take(1),
    map(user => {
      if (user) {
        return true; // User is logged in, allow access.
      } else {
        // User is not logged in, redirect to the login page.
        return router.parseUrl('/login');
      }
    })
  );
};