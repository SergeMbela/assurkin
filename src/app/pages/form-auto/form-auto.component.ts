import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of, EMPTY } from 'rxjs';
import { DbConnectService, PostalCode, Marque, Modele } from '../../services/db-connect.service';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';


@Component({
  selector: 'app-form-auto',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './form-auto.component.html'
})
export class FormAutoComponent implements OnInit {

  // --- Preneur d'assurance ---
  preneurPostalCode = '';
  preneurCity = '';
  preneurCities: string[] = [];
  filteredPreneurPostalCodes: PostalCode[] = [];

  // --- Conducteur principal ---
  conducteurPostalCode = '';
  conducteurCity = '';
  conducteurCities: string[] = [];
  filteredConducteurPostalCodes: PostalCode[] = [];

  // --- Véhicule ---
  marque = '';
  selectedMarque: Marque | null = null;
  filteredMarques: Marque[] = [];
  modele = '';
  filteredModeles: Modele[] = [];

  // --- Logique de visibilité ---
  isConducteurDifferent = false;
  isLoading = false;
  isMarqueLoading = false;
  isModeleLoading = false;

  // --- Sujets pour la recherche avec debounce ---
  private marque$!: Subject<string>;
  private modele$!: Subject<string>;
  private preneurPostalCode$!: Subject<string>;
  private conducteurPostalCode$!: Subject<string>;
  private destroy$!: Subject<void>;
  // --- Date minimum ---
  minDate: string;

  autoForm: FormGroup;

  constructor(
    private dbConnectService: DbConnectService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    this.autoForm = this.fb.group({
      preneur: this.fb.group({
        genre: ['Madame', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: ['', Validators.required],
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        adresse: ['', Validators.required],
        codePostal: ['', Validators.required],
        ville: ['', Validators.required],
        permis: ['', Validators.required],
        datePermis: ['', Validators.required],
      }),
      conducteurDifferent: [false],
      conducteur: this.fb.group({
        genre: ['Madame'],
        nom: [''],
        prenom: [''],
        dateNaissance: [''],
        adresse: [''],
        codePostal: [''],
        ville: [''],
        permis: [''],
        datePermis: [''],
      }),
      vehicule: this.fb.group({
        type: ['', Validators.required],
        marque: ['', Validators.required],
        modele: ['', Validators.required],
        puissance: ['', Validators.required],
        places: ['', Validators.required],
        dateCirculation: ['', Validators.required],
        valeur: [''],
      }),
      dateEffet: [this.minDate, Validators.required],
    });
  }
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.preneurPostalCode$ = new Subject<string>();
      this.conducteurPostalCode$ = new Subject<string>();
      this.modele$ = new Subject<string>();
      this.marque$ = new Subject<string>();
      this.destroy$ = new Subject<void>();

      this.preneurPostalCode$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((prefix) => {
          console.log(`[Preneur] Recherche pour le préfixe: "${prefix}"`);
          this.isLoading = true;
        }),
        switchMap(prefix => {
          if (prefix.length < 2) {
            this.filteredPreneurPostalCodes = [];
            this.preneurCities = [];
            this.preneurCity = '';
            return of([]);
          }
          return this.dbConnectService.getPostalCodes(prefix);
        }),
        takeUntil(this.destroy$)
      ).subscribe(postalCodes => {
        console.log('[Preneur] Résultats reçus:', postalCodes);
        this.filteredPreneurPostalCodes = postalCodes;
        this.isLoading = false;
      });

      this.conducteurPostalCode$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((prefix) => {
          console.log(`[Conducteur] Recherche pour le préfixe: "${prefix}"`);
          this.isLoading = true;
        }),
        switchMap(prefix => {
          if (prefix.length < 2) {
            this.filteredConducteurPostalCodes = [];
            this.conducteurCities = [];
            this.conducteurCity = '';
            return of([]);
          }
          return this.dbConnectService.getPostalCodes(prefix);
        }),
        takeUntil(this.destroy$)
      ).subscribe(postalCodes => {
        console.log('[Conducteur] Résultats reçus:', postalCodes);
        this.filteredConducteurPostalCodes = postalCodes;
        this.isLoading = false;
      });

      this.marque$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.isMarqueLoading = true),
        switchMap(prefix => {
          if (prefix.length < 1) {
            this.filteredMarques = [];
            return of([]);
          }
          return this.dbConnectService.searchMarques(prefix);
        }),
        takeUntil(this.destroy$)
      ).subscribe(marques => {
        this.filteredMarques = marques;
        console.log('[Marque] Marques reçues:', marques);
        this.isMarqueLoading = false;
      });

      this.modele$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.isModeleLoading = true),
        switchMap(prefix => {
          if (!this.selectedMarque || prefix.length < 1) {
            this.filteredModeles = [];
            return of([]);
          }
          return this.dbConnectService.searchModeles(this.selectedMarque.marque_id, prefix);
        }),
        takeUntil(this.destroy$)
      ).subscribe(modeles => {
        this.filteredModeles = modeles;
        console.log('[Modele] Modèles reçus:', modeles);
        this.isModeleLoading = false;
      });
    }

    this.autoForm.get('conducteurDifferent')?.valueChanges.subscribe(isDifferent => {
      const conducteurGroup = this.autoForm.get('conducteur') as FormGroup;
      if (isDifferent) {
        conducteurGroup.get('nom')?.setValidators(Validators.required);
        conducteurGroup.get('prenom')?.setValidators(Validators.required);
        conducteurGroup.get('dateNaissance')?.setValidators(Validators.required);
        conducteurGroup.get('adresse')?.setValidators(Validators.required);
        conducteurGroup.get('codePostal')?.setValidators(Validators.required);
        conducteurGroup.get('ville')?.setValidators(Validators.required);
        conducteurGroup.get('permis')?.setValidators(Validators.required);
        conducteurGroup.get('datePermis')?.setValidators(Validators.required);
      } else {
        conducteurGroup.get('nom')?.clearValidators();
        conducteurGroup.get('prenom')?.clearValidators();
        conducteurGroup.get('dateNaissance')?.clearValidators();
        conducteurGroup.get('adresse')?.clearValidators();
        conducteurGroup.get('codePostal')?.clearValidators();
        conducteurGroup.get('ville')?.clearValidators();
        conducteurGroup.get('permis')?.clearValidators();
        conducteurGroup.get('datePermis')?.clearValidators();
      }
      Object.keys(conducteurGroup.controls).forEach(key => {
        conducteurGroup.get(key)?.updateValueAndValidity();
      });
    });
  }

  onMarqueInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.trim();
    // Exécuter uniquement dans le navigateur pour éviter de déclencher des observables côté serveur
    if (isPlatformBrowser(this.platformId)) {
      this.marque$.next(input);

      // Si le champ de la marque est vidé, on réinitialise le modèle.
      if (input === '') {
        this.selectedMarque = null;
        this.modele = '';
        this.filteredModeles = [];
      }
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.destroy$.next();
      this.destroy$.complete();
    }
  }


  /**
   * Gère la recherche et le filtrage des codes postaux lors de la saisie.
   * @param event L'événement d'input.
   * @param type 'preneur' ou 'conducteur'.
   */
  onPostalCodeInput(event: Event, type: 'preneur' | 'conducteur'): void {
    const input = (event.target as HTMLInputElement).value.trim();
    // Exécuter uniquement dans le navigateur
    if (isPlatformBrowser(this.platformId)) {
      if (type === 'preneur') {
        this.preneurPostalCode$.next(input);
      } else if (type === 'conducteur') {
        this.conducteurPostalCode$.next(input);
      }
    }
  }

  /**
   * Gère la sélection d'un code postal dans la liste d'autocomplétion.
   * @param postalCode Le code postal sélectionné.
   * @param type 'preneur' ou 'conducteur'.
   */
  selectPostalCode(selectedCity: PostalCode, type: 'preneur' | 'conducteur'): void {
    if (type === 'preneur') {
      this.preneurPostalCode = selectedCity.postalCode;
      this.preneurCity = selectedCity.city;
      this.preneurCities = [selectedCity.city];
      this.filteredPreneurPostalCodes = [];
    } else {
      this.conducteurPostalCode = selectedCity.postalCode;
      this.conducteurCity = selectedCity.city;
      this.conducteurCities = [selectedCity.city];
      this.filteredConducteurPostalCodes = [];
    }
  }

  selectMarque(marque: Marque): void {
    this.marque = marque.nom;
    this.selectedMarque = marque;
    this.filteredMarques = []; // Cache la liste des marques
    this.modele = ''; // Réinitialise la sélection du modèle
    this.filteredModeles = []; // Vide la liste des modèles
    this.isModeleLoading = true;
  }

  onModeleInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.trim();
    if (isPlatformBrowser(this.platformId)) {
      this.modele$.next(input);
    }
  }
  selectModele(modele: Modele): void {
    this.modele = modele.nom;
    this.autoForm.get('vehicule.modele')?.setValue(modele.nom);
    this.filteredModeles = []; // Hide the autocomplete list
  }
}