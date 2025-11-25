import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DbConnectService } from '../../../services/db-connect.service';
import { Observable, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';

// Interfaces
export interface AutoQuoteSummary {
  id: number;
  nom: string;
  prenom: string;
  dateDemande: string;
  statut: string;
  type: QuoteType;
}

export type QuoteType = 'automobile' | 'habitation' | 'obseques' | 'rc' | 'juridique' | 'voyages';

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: any | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private dbConnectService = inject(DbConnectService);

  quotes$: Observable<DataState<AutoQuoteSummary[]>> = of({ data: null, loading: true, error: null });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Côté client (navigateur), on lance la récupération des données et on utilise startWith.
      const searchTerm = '';
      const page = 1;
      const itemsPerPage = 10;
      const apiCall$ = this.dbConnectService.getAllAutoQuotes(searchTerm, page, itemsPerPage);
      this.quotes$ = this.fetchData(apiCall$).pipe(
        startWith({ data: null, loading: true, error: null })
      );
    } else {
      // Côté serveur (SSR), on initialise avec un état non-bloquant (pas de chargement).
      this.quotes$ = of({ data: [], loading: false, error: null });
    }
  }

  private fetchData(apiCall$: Observable<{ data: any[], count: number | null }>): Observable<DataState<AutoQuoteSummary[]>> {
    return apiCall$.pipe(
      map(response => {
        console.log('[DashboardComponent] fetchData rawData:', response.data);
        return {
          data: response.data.map(item => ({
            id: item.id,
            nom: item.preneur?.nom ?? 'N/A',
            prenom: item.preneur?.prenom ?? '',
            dateDemande: item.created_at,
            statut: item.statut || 'Nouveau',
            type: 'automobile' as QuoteType
          })),
          loading: false,
          error: null
        };
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des données pour le dashboard:', error);
        return of({
          data: null,
          loading: false,
          error
        });
      }));
  }

  viewDetails(type: QuoteType, id: number): void {
    if (!type) return;

    this.router.navigate([`/intranet/gestion-${type}`, id]);
  }
}
