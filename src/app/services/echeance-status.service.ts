import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DbConnectService, EcheanceStatus } from './db-connect.service'; // Correction du chemin si nécessaire
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EcheanceStatusService {
  private platformId = inject(PLATFORM_ID);
  private statusMap = new Map<number, string>();
  private statusesLoaded = false;

  constructor(private dbService: DbConnectService) {
    // Only load statuses if running in a browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.loadStatuses();
    }
  }

  private loadStatuses(): void {
    this.dbService.getAllEcheanceStatuts().pipe(
      tap(statuses => {
        console.log(`[EcheanceStatusService] Loaded ${statuses.length} statuses.`);
        statuses.forEach(status => this.statusMap.set(status.id_echeance, status.label));
        this.statusesLoaded = true;
      })
    ).subscribe();
  }

  public getStatusLabel(statusId: number): string {
    if (!this.statusesLoaded) {
      return 'Chargement...';
    }
    return this.statusMap.get(statusId) || `Inconnu (${statusId})`;
  }
}