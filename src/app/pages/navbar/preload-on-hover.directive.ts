import { Directive, HostListener, Input } from '@angular/core';
import { Router, Route } from '@angular/router';
import { OnDemandPreloadingStrategy } from './on-demand-preloading.strategy';

@Directive({
  selector: '[appPreloadOnHover]',
  standalone: true,
})
export class PreloadOnHoverDirective {
  @Input('appPreloadOnHover') routePath: string | undefined;

  constructor(
    private router: Router,
    private preloadStrategy: OnDemandPreloadingStrategy
  ) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.routePath) {
      const route = this.router.config.find((r) => r.path === this.routePath);
      if (route) {
        this.preloadStrategy.startPreload(route);
      }
    }
  }
}