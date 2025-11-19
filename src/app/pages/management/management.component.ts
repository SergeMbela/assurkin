import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ManagementService, DataState, AutoQuoteSummary, HabitationQuoteSummary, ObsequesQuoteSummary, VoyageQuoteSummary } from '../../services/management.service';
import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { map, startWith, shareReplay, tap, switchMap } from 'rxjs/operators';

type QuoteType = 'auto' | 'habitation' | 'obseques' | 'rc' | 'voyage';
// Un type d'union pour représenter n'importe quel résumé de devis.
type AnyQuoteSummary = AutoQuoteSummary | HabitationQuoteSummary | ObsequesQuoteSummary | VoyageQuoteSummary;
@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './management.component.html',
  styleUrl: './management.component.css'
})
export class ManagementComponent implements OnInit {
  // Injection via le constructeur pour une meilleure compatibilité SSR
  constructor(
    private managementService: ManagementService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  searchControl = new FormControl('');

  // Gestion de l'onglet actif
  tabs: { id: QuoteType, label: string }[] = [
    { id: 'auto', label: 'Automobile' },
    { id: 'habitation', label: 'Habitation' },
    { id: 'obseques', label: 'Obsèques' },
    { id: 'rc', label: 'RC Familiale' },
    { id: 'voyage', label: 'Voyage' }
  ];
  activeTab$ = new BehaviorSubject<QuoteType>('auto');

  // Logique de pagination
  itemsPerPage = 20;
  currentPage$ = new BehaviorSubject<number>(1);

  // Observable final pour le template
  vm$!: Observable<{
    state: DataState<AnyQuoteSummary[]>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    } | null;
  }>;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const quotesData$ = this.activeTab$.pipe(
        switchMap(tabId => {
          switch (tabId) {
            case 'auto':
              return this.managementService.getAutoQuotesState();
            case 'habitation':
              return this.managementService.getHabitationQuotesState();
            case 'obseques':
              return this.managementService.getObsequesQuotesState();
            // Pour RC et Voyage, on retourne un état vide pour l'instant
            case 'rc':
              return this.managementService.getEmptyState<AnyQuoteSummary[]>();
            case 'voyage':
              return this.managementService.getVoyageQuotesState();
            default:
              return of({ data: [], loading: false, error: null });
          }
        }),
        shareReplay(1)
      );

      const searchTerm$ = this.searchControl.valueChanges.pipe(
        startWith(''), // Émet une valeur initiale pour que le filtre s'applique au chargement
        tap(() => this.currentPage$.next(1)) // Réinitialise à la page 1 à chaque nouvelle recherche
      );

      this.vm$ = combineLatest([quotesData$, searchTerm$, this.currentPage$]).pipe(
        map(([state, searchTerm, currentPage]) => {
          // Si chargement, erreur, ou pas de données, on retourne l'état tel quel.
          if (state.loading || state.error || !state.data) {
            return { state, pagination: null };
          }

          // 1. Filtrage des données
          const lowerCaseSearchTerm = (searchTerm || '').toLowerCase();
          const filteredData = state.data.filter(quote =>
            quote.nom.toLowerCase().includes(lowerCaseSearchTerm) ||
            quote.prenom.toLowerCase().includes(lowerCaseSearchTerm) ||
            quote.id.toString().includes(lowerCaseSearchTerm) ||
            ('marqueVehicule' in quote && quote.marqueVehicule.toLowerCase().includes(lowerCaseSearchTerm)) || // Recherche conditionnelle et type-safe
            ('description' in quote && quote.description.toLowerCase().includes(lowerCaseSearchTerm))
          );

          // 2. Calcul de la pagination
          const totalItems = filteredData.length;
          const totalPages = Math.ceil(totalItems / this.itemsPerPage);
          const startIndex = (currentPage - 1) * this.itemsPerPage;
          const paginatedData = filteredData.slice(startIndex, startIndex + this.itemsPerPage);

          return {
            state: { ...state, data: paginatedData }, // L'état contient maintenant les données paginées
            pagination: {
              currentPage,
              totalPages,
              totalItems
            }
          };
        })
      );
    } else {
      // Côté serveur, on initialise vm$ avec un état vide pour éviter les erreurs.
      this.vm$ = of({
        state: { data: [], loading: false, error: null },
        pagination: null
      });
    }
  }

  goToPage(page: number): void {
    this.currentPage$.next(page);
  }

  setActiveTab(tabId: QuoteType): void {
    this.activeTab$.next(tabId);
  }

  /**
   * Navigue vers la page de détail d'un devis automobile.
   * @param id L'ID du devis.
   */
  viewDetails(id: number): void {
    // Navigue vers la nouvelle page de détails sous /management.
    // On passe le type de l'onglet actif dans le state.
    this.router.navigate(['/assurance-details', id], { state: { type: this.activeTab$.value } });
  }

  /**
   * Garde de type pour vérifier si un devis est un devis automobile.
   * @param quote L'objet devis à vérifier.
   * @returns Un booléen indiquant si le devis est de type AutoQuoteSummary.
   */
  isAutoQuote(quote: AnyQuoteSummary): quote is AutoQuoteSummary {
    return 'typeVehicule' in quote;
  }

  /**
   * Garde de type pour vérifier si un devis a une description (Habitation, Obsèques).
   * @param quote L'objet devis à vérifier.
   * @returns Un booléen indiquant si le devis est de type HabitationQuoteSummary ou ObsequesQuoteSummary.
   */
  isDescriptionQuote(quote: AnyQuoteSummary): quote is HabitationQuoteSummary | ObsequesQuoteSummary | VoyageQuoteSummary {
    return 'description' in quote;
  }
}
