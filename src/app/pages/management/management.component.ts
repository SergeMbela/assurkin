import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Nationality } from '../../services/db-connect.service';
import { AbstractControl, ReactiveFormsModule, FormControl, FormsModule, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms'; //
import { PhoneNumberMaskDirective } from '../../directives/phone-number-mask.directive'; // Import the directive
import { ManagementService, DataState, AutoQuoteSummary, HabitationQuoteSummary, ObsequesQuoteSummary, VoyageQuoteSummary, RcQuoteSummary } from '../../services/management.service';

import { Observable, combineLatest, BehaviorSubject, of, Subject } from 'rxjs';
import { map, startWith, shareReplay, tap, switchMap, debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';
import { StateContainerComponent } from '../../state-container.component';

import { formatBelgianPhoneNumber } from '../../directives/phone-number.utils'; // Import the utility function
type QuoteType = 'auto' | 'habitation' | 'obseques' | 'rc' | 'voyage';
// Un type d'union pour représenter n'importe quel résumé de devis.
export type AnyQuoteSummary = (AutoQuoteSummary | HabitationQuoteSummary | ObsequesQuoteSummary | VoyageQuoteSummary | RcQuoteSummary) & {
  // Assurer que les champs du preneur sont optionnels sur le type d'union
  // pour satisfaire TypeScript lors de l'accès dans openEditModal.
  email?: string;
  telephone?: string;
  date_naissance?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  nationality?: string;
  idcard_number?: string;
  idcard_validity?: string;
  numero_national?: string;
  permis_numero?: string; // Ajouté pour le permis de conduire
  permis_date?: string; // Ajouté pour la date du permis de conduire
  uid?: string; // Ajouté pour identifier les utilisateurs avec un compte
};

/**
 * Validateur personnalisé pour le numéro de registre national belge.
 * Vérifie la longueur (11 chiffres) et la somme de contrôle (checksum).
 */
export function belgianNationalNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    // Ne pas valider les valeurs vides, laisser le validateur 'required' s'en charger.
    if (!value) {
      return null;
    }

    // 1. Supprimer les caractères non numériques
    const digits = String(value).replace(/\D/g, '');

    // 2. Vérifier la longueur
    if (digits.length !== 11) {
      return { belgianNationalNumber: { invalidLength: true } };
    }

    const baseNumberStr = digits.substring(0, 9);
    const checksum = parseInt(digits.substring(9, 11), 10);

    // 3. Valider la somme de contrôle pour les naissances avant et après 2000
    const checkPre2000 = 97 - (parseInt(baseNumberStr, 10) % 97);
    const checkPost2000 = 97 - (parseInt('2' + baseNumberStr, 10) % 97);

    // Si la somme de contrôle ne correspond à aucune des deux méthodes, le numéro est invalide.
    return (checksum === checkPre2000 || checksum === checkPost2000) ? null : { belgianNationalNumber: { invalidChecksum: true } };
  };
}

/**
 * Validateur de formulaire croisé pour vérifier que la date de naissance
 * correspond à celle encodée dans le numéro national belge.
 */
export function nationalNumberBirthDateValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) {
      return null;
    }

    const nationalNumberControl = group.get('numero_national');
    const birthDateControl = group.get('date_naissance');

    // Ne pas valider si les champs sont absents, vides ou si le numéro national est déjà invalide.
    if (!nationalNumberControl || !birthDateControl || !nationalNumberControl.value || !birthDateControl.value || nationalNumberControl.errors) {
      return null;
    }

    const nationalNumber = String(nationalNumberControl.value).replace(/\D/g, '');
    const birthDateValue = birthDateControl.value; // Format 'YYYY-MM-DD'

    if (nationalNumber.length !== 11) {
      return null; // Laisser l'autre validateur gérer l'erreur de longueur
    }

    // Déterminer le siècle en se basant sur la validité du checksum pour l'an 2000+
    const baseNumberStr = nationalNumber.substring(0, 9);
    const checksum = parseInt(nationalNumber.substring(9, 11), 10);
    const checkPost2000 = 97 - (parseInt('2' + baseNumberStr, 10) % 97);
    const century = (checksum === checkPost2000) ? '20' : '19';

    const year = century + nationalNumber.substring(0, 2);
    const month = nationalNumber.substring(2, 4);
    const day = nationalNumber.substring(4, 6);
    const birthDateFromNN = `${year}-${month}-${day}`;

    if (birthDateFromNN !== birthDateValue) {
      // Appliquer l'erreur directement sur le champ de la date de naissance pour un affichage ciblé.
      birthDateControl.setErrors({ ...birthDateControl.errors, birthDateMismatch: true });
    }

    return null; // La validation est gérée en appliquant l'erreur sur le contrôle enfant.
  };
}

import { DbConnectService } from '../../services/db-connect.service';
@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, StateContainerComponent, FormsModule, PhoneNumberMaskDirective],
  templateUrl: './management.component.html',
  styleUrl: './management.component.css'
})
export class ManagementComponent implements OnInit {
  // Injection via le constructeur pour une meilleure compatibilité SSR
  constructor(
    private managementService: ManagementService,
    private router: Router,
    private dbConnectService: DbConnectService, // Injection du service DB
    private fb: FormBuilder, // Injection du FormBuilder
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

  private destroy$ = new Subject<void>();

  // ===== PROPRIÉTÉS POUR LE MODAL =====
  isEditModalOpen = false;
  editModalTitle: string = '';
  selectedQuoteForEdit: AnyQuoteSummary | null = null;
  preneurForm!: FormGroup;
  citiesForPostalCode$: Observable<string[]> = of([]);
  nationalities$: Observable<Nationality[]> = of([]);
  isCitiesLoading$ = new BehaviorSubject<boolean>(false);
  isNationalitiesLoading$ = new BehaviorSubject<boolean>(false);

  // ===== PROPRIÉTÉS POUR LA POPUP DE NOTIFICATION =====
  showNotificationPopup = false;
  notificationPopupTitle = '';
  notificationPopupMessage = '';

  ngOnInit(): void {
    this.initPreneurForm(); // Initialiser le formulaire
    this.isNationalitiesLoading$.next(true);
    this.nationalities$ = this.dbConnectService.getNationalities().pipe(
      finalize(() => this.isNationalitiesLoading$.next(false)),
      shareReplay(1)
    );
    if (isPlatformBrowser(this.platformId)) {
      this.setupPostalCodeListener(); // Ajout de l'écouteur pour le code postal
      
      // Initialiser et s'abonner au Realtime
      this.dbConnectService.initializeRealtimeSubscriptions();
      this.dbConnectService.onNewQuote$
        .pipe(takeUntil(this.destroy$))
        .subscribe(event => {
          const currentTab = this.activeTab$.value;
          let shouldRefresh = false;

          // Vérifier si la nouvelle donnée correspond à l'onglet actif
          switch (event.table) {
            case 'devis_assurance':
              if (currentTab === 'auto') shouldRefresh = true;
              break;
            case 'habitation_quotes':
              if (currentTab === 'habitation') shouldRefresh = true;
              break;
            case 'obseques_quotes':
              if (currentTab === 'obseques') shouldRefresh = true;
              break;
            case 'rc_familiale_quotes':
              if (currentTab === 'rc') shouldRefresh = true;
              break;
            case 'assu_voyage':
              if (currentTab === 'voyage') shouldRefresh = true;
              break;
          }

          if (shouldRefresh) {
            console.log(`[ManagementComponent] Rafraîchissement de la vue suite à une nouvelle entrée dans ${event.table}`);
            this.refreshCurrentView();
          }

          // Afficher la popup pour toute nouvelle entrée
          this.notificationPopupTitle = 'Nouvelle demande reçue !';
          this.showNotificationPopup = true;
          
          switch (event.table) {
            case 'devis_assurance':
              this.notificationPopupMessage = `Nouvelle offre AUTO de ${event.data.prenom || 'Client'} ${event.data.nom || ''}`;
              break;
            case 'habitation_quotes':
              this.notificationPopupMessage = `Nouvelle offre HABITATION pour ${event.data.batiment_ville || 'une adresse'}`;
              break;
            case 'obseques_quotes':
              this.notificationPopupMessage = 'Nouvelle demande OBSÈQUES reçue';
              break;
            default:
              this.notificationPopupMessage = 'Une nouvelle entrée a été ajoutée.';
          }
        });

      const searchTerm$ = this.searchControl.valueChanges.pipe(
        startWith(''), // Émet une valeur initiale pour que le filtre s'applique au chargement
        debounceTime(300), // Attend 300ms après la dernière frappe
        distinctUntilChanged(), // N'émet que si la valeur a changé
        tap(() => this.currentPage$.next(1)) // Réinitialise à la page 1 à chaque nouvelle recherche
      );

      this.vm$ = combineLatest([
        this.activeTab$, searchTerm$, this.currentPage$
      ]).pipe(
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

              // La recherche est maintenant gérée par le backend, on utilise directement les données.
              const totalItems = state.data.totalItems;
              const totalPages = Math.ceil(totalItems / this.itemsPerPage);
              return {
                // On retourne l'état tel quel, car le filtrage est déjà fait par le backend.
                // Le filtrage côté client a été supprimé pour éviter les conflits.
                state: state,
                pagination: {
                  currentPage,
                  totalPages,
                  totalItems
                }
              };
            })
          );
        }),
        takeUntil(this.destroy$)
      );
    } else {
      // Côté serveur, on initialise vm$ avec un état vide pour éviter les erreurs.
      this.vm$ = of({
        state: { data: { quotes: [], totalItems: 0 }, loading: true, error: null },
        pagination: null
      });
    }
  }

  private initPreneurForm(): void {
    this.preneurForm = this.fb.group({
      id: [null], // Garder une trace de l'ID du preneur
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      date_naissance: [''],
      adresse: [''],
      code_postal: [''],
      ville: [''],
      nationality: [''],
      idcard_number: [''],
      idcard_validity: [''],
      numero_national: ['', belgianNationalNumberValidator()],
      permis_numero: [''], // Ajout du contrôle pour le numéro de permis
      permis_date: [''], // Ajout du contrôle pour la date du permis
    }, {
      validators: nationalNumberBirthDateValidator() // Appliquer le validateur croisé au groupe
    });
  }

  private setupPostalCodeListener(): void {
    const postalCodeControl = this.preneurForm.get('code_postal');
    if (postalCodeControl) {
      this.citiesForPostalCode$ = postalCodeControl.valueChanges.pipe(
        startWith(postalCodeControl.value), // Émet la valeur initiale lors de la souscription
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(postalCode => {
          // On ne fait l'appel que si le code postal a 4 chiffres (standard belge)
          if (postalCode && /^\d{4}$/.test(postalCode)) {
            this.isCitiesLoading$.next(true);
            return this.dbConnectService.getCitiesByPostalCode(postalCode).pipe(
              tap(cities => {
                // Si une seule ville est retournée, on la sélectionne automatiquement.
                if (cities.length === 1) {
                  this.preneurForm.get('ville')?.setValue(cities[0]);
                }
                this.isCitiesLoading$.next(false);
              })
            );
          }
          return of([]); // Retourne un tableau vide si le code postal est invalide
        }),
        shareReplay(1)
      );
    }
  }

  logout(): void {
    this.router.navigate(['/']);
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

  // ===== MÉTHODES POUR LE MODAL =====

  /**
   * Ouvre le modal de modification et initialise les données du preneur.
   * @param quote L'objet devis complet.
   * @param personId L'ID de la personne à modifier (preneur ou conducteur).
   */
  openEditModal(quote: AnyQuoteSummary, personId: number): void {
    // Définir le titre de la modale
    if (this.isAutoQuote(quote) && quote.preneur_id !== quote.conducteur_id && personId === quote.conducteur_id) {
      this.editModalTitle = 'Modifier le Conducteur Principal';
    } else {
      this.editModalTitle = 'Modifier le Preneur';
    }

    this.dbConnectService.getPersonById(personId).subscribe({
      next: (person) => {
        if (person) {
          // Fonction pour formater les dates en 'yyyy-MM-dd' pour les inputs de type 'date'
          const formatDate = (dateString: string | undefined | null): string | null => {
            if (!dateString) return null;
            try {
              return new Date(dateString).toISOString().split('T')[0];
            } catch (e) {
              return null; // Gère les dates invalides
            }
          };

          // Remplir le formulaire avec les données de la personne récupérées
          this.preneurForm.patchValue({
            id: person.id,
            prenom: person.prenom,
            nom: person.nom,
            email: person.email,
            telephone: person.telephone,
            date_naissance: formatDate(person.date_naissance),
            adresse: person.adresse,
            code_postal: person.code_postal,
            ville: person.ville,
            nationality: person.nationality, // Assurez-vous que `person.nationality` contient l'ID
            idcard_number: person.idcard_number,
            idcard_validity: formatDate(person.idcard_validity),
            numero_national: person.numero_national,
            permis_numero: person.permis_numero, // Pré-remplir le numéro de permis
            permis_date: formatDate(person.permis_date), // Pré-remplir la date du permis
          });
          this.isEditModalOpen = true;
        } else {
          console.error(`Impossible de trouver les informations pour la personne avec l'ID ${personId}`);
          // TODO: Afficher un message d'erreur à l'utilisateur (ex: avec un toast)
        }
      },
      error: (err) => {
        console.error(`Erreur lors de la récupération de la personne avec l'ID ${personId}`, err);
      }
    });
  }

  /**
   * Ferme le modal de modification.
   */
  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.preneurForm.reset(); // Réinitialiser le formulaire
  }

  /**
   * Sauvegarde les modifications apportées au preneur.
   */
  savePreneurChanges(): void {
    if (this.preneurForm.invalid) {
      this.preneurForm.markAllAsTouched(); // Affiche les erreurs de validation
      console.warn('Formulaire invalide. Impossible de sauvegarder.');
      return;
    }

    const formValue = this.preneurForm.value;
    const preneurId = formValue.id;

    if (preneurId) {
      console.log(`Sauvegarde des données pour le preneur ID: ${preneurId}`, formValue);

      this.dbConnectService.updatePerson(preneurId, formValue).subscribe({
        next: (response) => {
          console.log('Preneur mis à jour avec succès:', response.data);
          // Rafraîchit la vue pour afficher les nouvelles données
          this.refreshCurrentView();
          this.closeEditModal();
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du preneur:', error);
          // TODO: Afficher un message d'erreur à l'utilisateur
        }
      });
    } else {
      console.warn('savePreneurChanges a été appelé sans ID de preneur dans le formulaire.');
    }
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

  /**
   * Rafraîchit les données de la vue actuelle en ré-émettant la page courante.
   */
  private refreshCurrentView(): void {
    const currentPage = this.currentPage$.value;
    this.currentPage$.next(currentPage);
  }

  closeNotificationPopup(): void {
    this.showNotificationPopup = false;
  }
}
