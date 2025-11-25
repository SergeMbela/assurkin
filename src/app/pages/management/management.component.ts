import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ManagementService, DataState, AutoQuoteSummary, HabitationQuoteSummary, ObsequesQuoteSummary, VoyageQuoteSummary, RcQuoteSummary } from '../../services/management.service';
import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { map, startWith, shareReplay, tap, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { StateContainerComponent } from '../../state-container.component';

type QuoteType = 'auto' | 'habitation' | 'obseques' | 'rc' | 'voyage';
// Un type d'union pour représenter n'importe quel résumé de devis.
type AnyQuoteSummary = AutoQuoteSummary | HabitationQuoteSummary | ObsequesQuoteSummary | VoyageQuoteSummary | RcQuoteSummary;
@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, StateContainerComponent],
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
    state: DataState<{ quotes: AnyQuoteSummary[], totalItems: number }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    } | null;
  }>;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const searchTerm$ = this.searchControl.valueChanges.pipe(
        startWith(''), // Émet une valeur initiale pour que le filtre s'applique au chargement
        debounceTime(300), // Attend 300ms après la dernière frappe
        distinctUntilChanged(), // N'émet que si la valeur a changé
        tap(() => this.currentPage$.next(1)) // Réinitialise à la page 1 à chaque nouvelle recherche
      );

      this.vm$ = combineLatest([this.activeTab$, searchTerm$, this.currentPage$]).pipe(
        switchMap(([tabId, searchTerm, currentPage]) => {
          console.log(`[ManagementComponent] Fetching data for tab: '${tabId}', search: '${searchTerm}', page: ${currentPage}`);
          // La logique de fetch est maintenant DANS le switchMap pour réagir à tous les changements
          let apiCall$: Observable<DataState<{ quotes: AnyQuoteSummary[], totalItems: number }>>;
          switch (tabId) {
            case 'auto':
              apiCall$ = this.managementService.getAutoQuotesState(searchTerm || '', currentPage, this.itemsPerPage);
              break;
            case 'habitation':
              apiCall$ = this.managementService.getHabitationQuotesState(searchTerm || '', currentPage, this.itemsPerPage);
              break;
            case 'obseques':
              apiCall$ = this.managementService.getObsequesQuotesState(searchTerm || '', currentPage, this.itemsPerPage);
              break;
            case 'rc':
              apiCall$ = this.managementService.getRcQuotesState(searchTerm || '', currentPage, this.itemsPerPage);
              break;
            case 'voyage':
              apiCall$ = this.managementService.getVoyageQuotesState(searchTerm || '', currentPage, this.itemsPerPage);
              break;
            default:
              apiCall$ = of({ data: { quotes: [], totalItems: 0 }, loading: false, error: null });
          }
          return apiCall$.pipe(
            map((state: DataState<{ quotes: AnyQuoteSummary[], totalItems: number }>) => {
              if (state.loading || state.error || !state.data) {
                return { state, pagination: null };
              }
              const totalItems = state.data.totalItems;
              const totalPages = Math.ceil(totalItems / this.itemsPerPage);
              return {
                state: { ...state, data: { quotes: state.data.quotes, totalItems: state.data.totalItems } },
                pagination: {
                  currentPage,
                  totalPages,
                  totalItems
                }
              };
            })
          );
        })
      );
    } else {
      // Côté serveur, on initialise vm$ avec un état vide pour éviter les erreurs.
      this.vm$ = of({
        state: { data: { quotes: [], totalItems: 0 }, loading: true, error: null },
        pagination: null
      });
    }
  }

  goToPage(page: number): void {
    this.currentPage$.next(page);
  }

  setActiveTab(tabId: QuoteType): void {
    console.log(`[ManagementComponent] Setting active tab to: '${tabId}'`);
    this.activeTab$.next(tabId);
  }

  /**
   * Navigue vers la page de détail d'un devis.
   * @param id L'ID du devis.
   */
  viewDetails(id: number): void {
    // Navigue vers la nouvelle page de détails sous /management.
    // On passe le type de l'onglet actif dans le state.
    const quoteType = this.activeTab$.value;
    console.log(`[ManagementComponent] Navigating to details for ID: ${id} with type: '${quoteType}' using new route.`);
    this.router.navigate(['/assurance-details', quoteType, id]);
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
   * Garde de type pour vérifier si un devis a une description (Habitation, Obsèques, RC, Voyage).
   * @param quote L'objet devis à vérifier.
   * @returns Un booléen indiquant si le devis est de type avec description.
   */
  isDescriptionQuote(quote: AnyQuoteSummary): quote is HabitationQuoteSummary | ObsequesQuoteSummary | RcQuoteSummary | VoyageQuoteSummary {
    return 'description' in quote;
  }
}
