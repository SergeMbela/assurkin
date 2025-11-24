import { Injectable, inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';
import { DbConnectService } from './db-connect.service';

// Interfaces partagées pour la gestion des devis.
export interface AutoQuoteSummary {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: string;
  typeVehicule: string;
  marqueVehicule: string;
  modeleVehicule: string;
}

export interface HabitationQuoteSummary {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: string;
  description: string;
}

export interface ObsequesQuoteSummary {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: string;
  description: string;
}

export interface VoyageQuoteSummary {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: string;
  description: string;
}

export interface RcQuoteSummary {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: string;
  description: string; // Mappé depuis 'risque'
}

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class ManagementService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly db = inject(DbConnectService);

  constructor() { }

  /**
   * Récupère l'état des devis auto, en gérant le rendu côté client et serveur (SSR).
   * @returns Un Observable de l'état des données (chargement, données, erreur).
   */
  getAutoQuotesState(): Observable<DataState<AutoQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      return this.fetchAndMapAutoData(this.db.getAllAutoQuotes());
    } else {
      // Côté serveur : on retourne un état stable et vide pour ne pas bloquer le rendu.
      return of({ data: [], loading: false, error: null });
    }
  }

  getHabitationQuotesState(): Observable<DataState<HabitationQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.db.getAllHabitationQuotes();
      return this.fetchAndMapHabitationData(apiCall$);
    } else {
      return of({ data: [], loading: false, error: null });
    }
  }

  getObsequesQuotesState(): Observable<DataState<ObsequesQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.db.getAllObsequesQuotes();
      return this.fetchAndMapObsequesData(apiCall$);
    } else {
      return of({ data: [], loading: false, error: null });
    }
  }

  getVoyageQuotesState(): Observable<DataState<VoyageQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.db.getAllVoyageQuotes();
      return this.fetchAndMapVoyageData(apiCall$);
    } else {
      return of({ data: [], loading: false, error: null });
    }
  }

  getRcQuotesState(): Observable<DataState<RcQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      return this.db.getAllRcQuotes().pipe(
        map(data => ({
          data: data.map(item => ({
            id: item.id,
            nom: item.preneur_nom,
            prenom: item.preneur_prenom,
            dateDemande: item.created_at,
            statut: item.statut || 'Nouveau', // 'statut' n'est pas dans la table, on met une valeur par défaut
            description: `Risque: ${item.risque}`
          })),
          loading: false,
          error: null
        })),
        startWith({ data: null, loading: true, error: null }),
        catchError(error => of({ data: null, loading: false, error }))
      );
    } else {
      return of({ data: [], loading: false, error: null });
    }
  }

  // Méthodes pour les autres types de devis (RC, Voyage) à implémenter ici...
  getEmptyState<T>(): Observable<DataState<T>> {
    return of({ data: [] as unknown as T, loading: false, error: null });
  }

  private fetchAndMapVoyageData(apiCall$: Observable<any[]>): Observable<DataState<VoyageQuoteSummary[]>> {
    return apiCall$.pipe(
      map(rawData => ({
        data: rawData.map(item => ({ id: item.id, nom: item.nom ?? 'N/A', prenom: item.prenom ?? '', dateDemande: item.date_created, statut: item.statut || 'Nouveau', description: item.description || 'Aucun message' })),
        loading: false,
        error: null
      })),
      catchError(error => of({ data: null, loading: false, error })),
      startWith({ data: null, loading: true, error: null })
    );
  }

  private fetchAndMapHabitationData(apiCall$: Observable<any[]>): Observable<DataState<HabitationQuoteSummary[]>> {
    return apiCall$.pipe(
      map(rawData => ({
        data: rawData.map((item: any) => ({ // Ajout du type 'any' pour la clarté
          id: item.id,
          nom: item.preneur?.nom ?? 'N/A',
          prenom: item.preneur?.prenom ?? '',
          dateDemande: item.created_at,
          statut: item.statut || 'Nouveau',
          description: `${item.batiment_type_maison} - ${item.batiment_adresse}`
        })),
        loading: false,
        error: null
      })),
      catchError(error => of({ data: null, loading: false, error })),
      startWith({ data: null, loading: true, error: null })
    );
  }

  private fetchAndMapAutoData(apiCall$: Observable<any[]>): Observable<DataState<AutoQuoteSummary[]>> {
    return apiCall$.pipe(
      map(rawData => {
        console.log('[ManagementService] Données brutes reçues de la DB:', rawData);
        return {
          data: rawData.map(item => ({
            id: item.id,
            nom: item.preneur?.nom ?? 'N/A',
            prenom: item.preneur?.prenom ?? '',
            dateDemande: item.created_at,
            statut: item.statut || 'Nouveau',
            typeVehicule: item.vehicules?.type ?? 'N/A',
            marqueVehicule: item.vehicules?.marque ?? 'N/A',
            modeleVehicule: item.vehicules?.modele ?? 'N/A'
          })),
          loading: false,
          error: null
        };
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des devis dans ManagementService:', error);
        return of({ data: null, loading: false, error });
      }),
      // Émettre un état de chargement initial dès la souscription.
      startWith({ data: null, loading: true, error: null })
    );
  }

  private fetchAndMapObsequesData(apiCall$: Observable<any[]>): Observable<DataState<ObsequesQuoteSummary[]>> {
    return apiCall$.pipe(
      map(rawData => ({
        data: rawData.map((item: any) => ({ // Ajout du type 'any' pour la clarté
          id: item.id,
          nom: item.preneur?.nom ?? 'N/A',
          prenom: item.preneur?.prenom ?? '',
          dateDemande: item.created_at,
          statut: item.statut || 'Nouveau',
          description: `Devis pour ${item.nombre_assures} personne(s)`
        })),
        loading: false,
        error: null
      })),
      catchError(error => of({ data: null, loading: false, error })),
      startWith({ data: null, loading: true, error: null })
    );
  }
}
