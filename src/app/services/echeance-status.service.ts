import { Injectable } from '@angular/core';
import { DbConnectService, EcheanceStatus } from './db-connect.service'; // Correction du chemin si nécessaire
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EcheanceStatusService {
  private statusMap = new Map<number, string>();
  private statusesLoaded = false;

  constructor(private dbService: DbConnectService) {
    this.loadStatuses();
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