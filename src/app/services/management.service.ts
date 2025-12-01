import { Injectable, inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';
import { DbConnectService } from './db-connect.service';

// Interfaces partagées pour la Gestion des offres.
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
  getAutoQuotesState(searchTerm: string, page: number, itemsPerPage: number): Observable<DataState<{ quotes: AutoQuoteSummary[], totalItems: number }>> {
    if (isPlatformBrowser(this.platformId)) {
      // On passe maintenant les paramètres de recherche et de pagination
      const apiCall$ = this.db.getAllAutoQuotes(searchTerm, page, itemsPerPage);
      return this.fetchAndMapAutoData(apiCall$);
    } else {
      // Côté serveur : on retourne un état stable et vide pour ne pas bloquer le rendu.
      return of({ data: { quotes: [], totalItems: 0 }, loading: false, error: null });
    }
  }

  getHabitationQuotesState(searchTerm: string, page: number, itemsPerPage: number): Observable<DataState<{ quotes: HabitationQuoteSummary[], totalItems: number }>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.db.getAllHabitationQuotes(searchTerm, page, itemsPerPage);
      return this.fetchAndMapHabitationData(apiCall$);
    } else {
      return of({ data: { quotes: [], totalItems: 0 }, loading: false, error: null });
    }
  }

  getObsequesQuotesState(searchTerm: string, page: number, itemsPerPage: number): Observable<DataState<{ quotes: ObsequesQuoteSummary[], totalItems: number }>> {
    if (isPlatformBrowser(this.platformId)) {
      const apiCall$ = this.db.getAllObsequesQuotes(searchTerm, page, itemsPerPage);
      return this.fetchAndMapObsequesData(apiCall$);
    } else {
      return of({ data: { quotes: [], totalItems: 0 }, loading: false, error: null });
    }
  }

  getVoyageQuotesState(searchTerm: string, page: number, itemsPerPage: number): Observable<DataState<{ quotes: VoyageQuoteSummary[], totalItems: number }>> {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Mettre à jour getAllVoyageQuotes pour la pagination et la recherche
      const apiCall$ = this.db.getAllVoyageQuotes(/* searchTerm, page, itemsPerPage */).pipe(
        map(data => ({
          data: data,
          count: data.length // Simule le comptage total en attendant la mise à jour de l'API
        }))
      );
      return this.fetchAndMapVoyageData(apiCall$ as Observable<{ data: any[], count: number | null }>);
    } else {
      return of({ data: { quotes: [], totalItems: 0 }, loading: false, error: null });
    }
  }

  getRcQuotesState(searchTerm: string, page: number, itemsPerPage: number): Observable<DataState<{ quotes: RcQuoteSummary[], totalItems: number }>> {
    if (isPlatformBrowser(this.platformId)) {
      // TODO: Mettre à jour getAllRcQuotes pour la pagination et la recherche
      return this.db.getAllRcQuotes(/* searchTerm, page, itemsPerPage */).pipe(
        map(response => ({
          data: { // Assuming response is an array of quote items
            quotes: response.map((item: any) => ({
              id: item.id,
              nom: item.preneur_nom ?? '',
              prenom: item.preneur_prenom ?? '',
              dateDemande: item.created_at,
              statut: item.statut || 'Nouveau', // 'statut' n'est pas dans la table, on met une valeur par défaut
              description: `Risque: ${item.risque}`
            })), totalItems: response.length // Simulate totalItems since API doesn't provide it
          },
          loading: false,
          error: null
        })),
        startWith({ data: null, loading: true, error: null }),
        catchError(error => {
          console.warn(
            `[ManagementService] Erreur 500 probable dans 'getRcQuotesState'.`,
            'Erreur API:',
            error
          );
          return of({ data: null, loading: false, error });
        })
      );
    } else {
      return of({ data: { quotes: [], totalItems: 0 }, loading: false, error: null });
    }
  }

  // Méthodes pour les autres types de devis (RC, Voyage) à implémenter ici...
  getEmptyState<T>(): Observable<DataState<T>> {
    return of({ data: { quotes: [], totalItems: 0 } as unknown as T, loading: false, error: null });
  }

  private fetchAndMapVoyageData(apiCall$: Observable<{ data: any[], count: number | null }>): Observable<DataState<{ quotes: VoyageQuoteSummary[], totalItems: number }>> {
    return apiCall$.pipe(
      map(response => ({
        data: { // Correction pour éviter 'N/A'
          quotes: response.data.map(item => ({ id: item.id, nom: item.nom ?? '', prenom: item.prenom ?? '', dateDemande: item.date_created, statut: item.statut || 'Nouveau', description: item.description || 'Aucun message' })),
          totalItems: response.count ?? 0
        },
        loading: false,
        error: null
      })),
      catchError(error => of({ data: null, loading: false, error })),
      startWith({ data: null, loading: true, error: null })
    );
  }

  private fetchAndMapHabitationData(apiCall$: Observable<{ data: any[], count: number | null }>): Observable<DataState<{ quotes: HabitationQuoteSummary[], totalItems: number }>> {
    return apiCall$.pipe(
      map(response => ({
        data: {
          quotes: response.data.map((item: any) => ({ // Correction pour éviter 'N/A'
            id: item.id,
            nom: item.preneur?.nom ?? '',
            prenom: item.preneur?.prenom ?? '',
            dateDemande: item.created_at,
            statut: item.statut || 'Nouveau',
            description: `${item.batiment_type_maison} - ${item.batiment_adresse}`
          })),
          totalItems: response.count ?? 0
        },
        loading: false,
        error: null
      })),
      catchError(error => of({ data: null, loading: false, error })),
      startWith({ data: null, loading: true, error: null })
    );
  }

  private fetchAndMapAutoData(apiCall$: Observable<{ data: any[], count: number | null }>): Observable<DataState<{ quotes: AutoQuoteSummary[], totalItems: number }>> {
    return apiCall$.pipe(
      map(response => {
        console.log('[ManagementService] Données brutes reçues de la DB:', response.data);
        return {
          data: {
            quotes: response.data.map(item => ({
              id: item.id, // Correction pour éviter 'N/A'
              nom: item.preneur?.nom ?? '',
              prenom: item.preneur?.prenom ?? '',
              dateDemande: item.created_at,
              statut: item.statut || 'Nouveau',
              typeVehicule: item.vehicules?.type ?? '',
              marqueVehicule: item.vehicules?.marque ?? '',
              modeleVehicule: `${item.vehicules?.modele ?? ''} ${item.vehicules?.annee ?? ''}`.trim()
            })),
            totalItems: response.count ?? 0
          },
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

  private fetchAndMapObsequesData(apiCall$: Observable<{ data: any[], count: number | null }>): Observable<DataState<{ quotes: ObsequesQuoteSummary[], totalItems: number }>> {
    return apiCall$.pipe(
      map(response => ({
        data: {
          quotes: response.data.map((item: any) => ({ // Correction pour éviter 'N/A'
            id: item.id,
            nom: item.preneur?.nom ?? '',
            prenom: item.preneur?.prenom ?? '',
            dateDemande: item.created_at,
            statut: item.statut || 'Nouveau',
            description: `Devis pour ${item.nombre_assures} personne(s)`
          })),
          totalItems: response.count ?? 0
        },
        loading: false,
        error: null
      })),
      catchError(error => of({ data: null, loading: false, error })),
      startWith({ data: null, loading: true, error: null })
    );
  }
}
