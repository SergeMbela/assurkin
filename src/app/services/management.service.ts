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

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class ManagementService {
  private platformId = inject(PLATFORM_ID);

  constructor(private injector: Injector) { }

  /**
   * Récupère l'état des devis auto, en gérant le rendu côté client et serveur (SSR).
   * @returns Un Observable de l'état des données (chargement, données, erreur).
   */
  getAutoQuotesState(): Observable<DataState<AutoQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      // Côté client : on récupère les données avec un état de chargement initial.
      // On utilise l'injecteur pour récupérer le service manuellement et uniquement
      // côté client, ce qui est sûr pour le SSR et respecte le contexte d'injection.
      return this.fetchAndMapAutoData(this.injector.get(DbConnectService).getAllAutoQuotes());
    } else {
      // Côté serveur : on retourne un état stable et vide pour ne pas bloquer le rendu.
      return of({ data: [], loading: false, error: null });
    }
  }

  getHabitationQuotesState(): Observable<DataState<HabitationQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.injector.get(DbConnectService).getAllHabitationQuotes();
      return this.fetchAndMapHabitationData(apiCall$);
    } else {
      return of({ data: [], loading: false, error: null });
    }
  }

  getObsequesQuotesState(): Observable<DataState<ObsequesQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.injector.get(DbConnectService).getAllObsequesQuotes();
      return this.fetchAndMapObsequesData(apiCall$);
    } else {
      return of({ data: [], loading: false, error: null });
    }
  }

  getVoyageQuotesState(): Observable<DataState<VoyageQuoteSummary[]>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.injector.get(DbConnectService).getAllVoyageQuotes();
      return this.fetchAndMapVoyageData(apiCall$);
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
        data: rawData.map(item => ({ id: item.id, nom: item.nom ?? 'N/A', prenom: item.prenom ?? '', dateDemande: item.date_created, statut: item.statut || 'Nouveau', description: item.message || 'Aucun message' })),
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
