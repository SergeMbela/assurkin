import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { map } from 'rxjs/operators';
import { from } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // We need to check if there is an active session.
  // A common pattern is to have a method in the AuthService that checks the current user.
  // This method is likely asynchronous. Let's assume `authService.getSession()` returns a Promise
  // with the session object or null.

  // We call the getSession method on our AuthService.
  // This returns a promise, so we convert it to an Observable using `from`.
  return from(authService.getSession()).pipe(
    map(({ data: { session } }) => {
      if (session) {
        return true; // User is authenticated, allow access
      } else {
        return router.parseUrl('/login'); // User is not authenticated, redirect to login
      }
    })
  );
};