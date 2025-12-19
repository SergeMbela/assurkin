import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fromEvent, Subscription, merge } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-network-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './network-status.component.html',
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
  isOnline: boolean = true;
  showBanner: boolean = false;
  private subscription: Subscription | null = null;

  constructor(private ngZone: NgZone) {
    // État initial (vérification pour SSR)
    if (typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine;
    }
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      // Fusionner les événements online et offline pour réagir aux changements
      this.subscription = merge(
        fromEvent(window, 'online').pipe(map(() => true)),
        fromEvent(window, 'offline').pipe(map(() => false))
      ).subscribe((isOnline) => {
        // NgZone assure que la détection de changement Angular se déclenche bien
        this.ngZone.run(() => {
          this.isOnline = isOnline;
          
          if (!isOnline) {
            // Toujours afficher la bannière si hors ligne
            this.showBanner = true;
          } else {
            // Si on revient en ligne, on affiche le message vert pendant 3 secondes puis on cache
            this.showBanner = true;
            setTimeout(() => {
              this.showBanner = false;
            }, 3000);
          }
        });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  closeBanner(): void {
    this.showBanner = false;
  }
}
