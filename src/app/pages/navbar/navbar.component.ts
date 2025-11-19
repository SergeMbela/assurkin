import { Component, ViewChild, ElementRef, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PreloadOnHoverDirective } from './preload-on-hover.directive';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, PreloadOnHoverDirective],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements AfterViewInit {
  @ViewChild('underline') private underlineRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollProgressBar') private scrollProgressBarRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('menuLink', { read: ElementRef }) private menuLinks!: QueryList<ElementRef>;

  menuOpen = false;
  showParticulierSubMenu = false;
  showProfessionelSubMenu = false;
  showMentionsLegalesSubMenu = false;
  particulierSubMenuOpen = false;
  professionelSubMenuOpen = false;
  isLoggedIn$: Observable<boolean>;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
    private authService: AuthService
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
  }

  ngAfterViewInit(): void {
    // Positionne le trait sur l'élément actif au chargement et après chaque navigation
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.moveUnderlineToActiveLink();
    });

    // Positionnement initial
    this.moveUnderlineToActiveLink();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.documentElement;
      const body = document.body;
      const scrollTop = element.scrollTop || body.scrollTop;
      const scrollHeight = element.scrollHeight || body.scrollHeight;
      const clientHeight = element.clientHeight;

      const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;

      this.scrollProgressBarRef.nativeElement.style.width = `${scrollPercent}%`;
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  onLinkHover(event: MouseEvent): void {
    this.moveUnderline(event.currentTarget as HTMLElement);
  }

  onMenuLeave(): void {
    this.moveUnderlineToActiveLink();
  }

  private moveUnderlineToActiveLink(): void {
    // Utilise setTimeout pour s'assurer que les classes routerLinkActive sont appliquées
    setTimeout(() => {
      const activeLink = this.menuLinks.find(el => el.nativeElement.classList.contains('text-indigo-600'));
      if (activeLink) {
        this.moveUnderline(activeLink.nativeElement);
      }
      this.cdr.detectChanges();
    }, 0);
  }

  private moveUnderline(element: HTMLElement): void {
    const underline = this.underlineRef.nativeElement;
    underline.style.width = `${element.offsetWidth}px`;
    underline.style.transform = `translateX(${element.offsetLeft}px)`;
  }
}