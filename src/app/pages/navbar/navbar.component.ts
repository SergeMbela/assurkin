import { Component, ViewChild, ElementRef, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements AfterViewInit {
  @ViewChild('underline') private underlineRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollProgressBar') private scrollProgressBarRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('menuLink', { read: ElementRef }) private menuLinks!: QueryList<ElementRef>;

  isMenuVisible = false;
  showMenu = false;
  showParticulierSubMenu = false;
  showProfessionelSubMenu = false;
  showMentionsLegalesSubMenu = false;
  particulierSubMenuOpen = false;
  professionelSubMenuOpen = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngAfterViewInit(): void {
    // Positionne le trait sur l'élément actif au chargement et après chaque navigation
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      // This should only run in the browser.
      // The logic inside manipulates the DOM which is not available on the server.
      if (isPlatformBrowser(this.platformId)) {
        this.moveUnderlineToActiveLink();
      }
      // Ferme le menu mobile après chaque navigation
      this.closeMenu();
    });
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
    if (this.isMenuVisible) {
      this.closeMenu();
    } else {
      this.isMenuVisible = true;
      // Léger délai pour permettre au *ngIf de s'exécuter avant de lancer l'animation
      setTimeout(() => {
        this.showMenu = true;
      }, 10);
    }
  }

  closeMenu(): void {
    if (this.isMenuVisible) {
      this.showMenu = false;
      // Attendre la fin de l'animation avant de retirer l'élément du DOM
      setTimeout(() => {
        this.isMenuVisible = false;
      }, 300); // Doit correspondre à la durée de la transition CSS
    }
  }

  onLinkHover(event: MouseEvent): void {
    if (isPlatformBrowser(this.platformId)) {
      this.moveUnderline(event.currentTarget as HTMLElement);
    }
  }

  onMenuLeave(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.moveUnderlineToActiveLink();
    }
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