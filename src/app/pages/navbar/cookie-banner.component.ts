import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.css'
})
export class CookieBannerComponent implements OnInit {
  isVisible = false;
  showBanner = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (!localStorage.getItem('cookies_accepted')) {
        this.isVisible = true;
        setTimeout(() => this.showBanner = true, 100); // Pour l'animation
      }
    }
  }

  acceptCookies(): void {
    localStorage.setItem('cookies_accepted', 'true');
    this.showBanner = false;
    setTimeout(() => this.isVisible = false, 300); // Attend la fin de l'animation
  }
}