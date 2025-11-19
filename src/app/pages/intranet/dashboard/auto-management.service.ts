import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DbConnectService } from '../../../services/db-connect.service';
 
/**
 * Represents the raw data structure for an auto quote received from the database.
 */
interface RawAutoQuote {
  id: number;
  created_at: string;
  statut: string | null;
  preneur: { nom: string; prenom: string } | null;
}

type AutoRequestStatus = 'Nouveau' | 'En cours' | 'Traité';
export interface AutoRequest {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: 'Nouveau' | 'En cours' | 'Traité';
}
@Injectable()
export class AutoManagementService {

  constructor(private dbConnectService: DbConnectService) { }

  getAutoRequests(): Observable<AutoRequest[]> {
    return this.dbConnectService.getAllAutoQuotes().pipe( // The service now returns Observable<RawAutoQuote[]>
      map((rawData: RawAutoQuote[]) => {
        console.log('[AutoManagementService] Données brutes reçues:', rawData);
        return rawData.map(item => this.transformToAutoRequest(item)); // Use arrow function to preserve 'this' context
      }),
      catchError(error => {
        console.error('[AutoManagementService] Erreur lors de la récupération des demandes auto:', error);
        return of([]); // Return an empty array on error to prevent the stream from breaking.
      })
    );
  }

  /**
   * Transforms a raw quote object into a structured AutoRequest.
   * @param item The raw quote data from the database.
   * @returns A structured AutoRequest object.
   */
  private transformToAutoRequest(item: RawAutoQuote): AutoRequest {
    return {
      id: item.id,
      nom: item.preneur?.nom ?? 'N/A',
      prenom: item.preneur?.prenom ?? '',
      dateDemande: item.created_at,
      statut: this.normalizeStatus(item.statut)
    };
  }

  /**
   * Normalizes the status string to a valid AutoRequestStatus.
   */
  private normalizeStatus(status: string | null): AutoRequestStatus {
    const validStatuses: AutoRequestStatus[] = ['Nouveau', 'En cours', 'Traité'];
    if (status && validStatuses.includes(status as AutoRequestStatus)) {
      return status as AutoRequestStatus;
    }
    return 'Nouveau'; // Default status
  }
}