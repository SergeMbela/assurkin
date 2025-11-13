import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, EMPTY, merge } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OnDemandPreloadingStrategy implements PreloadingStrategy {
  private preloadOnDemand$: Observable<Route>;
  private preloadOnDemandSubject: { next: (route: Route) => void } = {
    next: () => {},
  };

  constructor() {
    this.preloadOnDemand$ = new Observable(
      (subscriber) => (this.preloadOnDemandSubject = subscriber)
    );
  }

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return this.preloadOnDemand$.pipe(
      switchMap((preloadRoute) => (route === preloadRoute ? load() : EMPTY))
    );
  }

  startPreload(route: Route): void {
    this.preloadOnDemandSubject.next(route);
  }
}