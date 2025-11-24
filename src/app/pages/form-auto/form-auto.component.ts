import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormControl } from '@angular/forms';
import { Subject, of, Observable } from 'rxjs';
import { DbConnectService, PostalCode, Marque, Modele } from '../../services/db-connect.service';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, map, catchError, first } from 'rxjs/operators'
import { PhoneFormatDirective } from '../../directives/phone-format.directive';

@Component({
  selector: 'app-form-auto',
  standalone: true,
  providers: [DbConnectService],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, PhoneFormatDirective],
  templateUrl: './form-auto.component.html'
})
export class FormAutoComponent implements OnInit, OnDestroy {
  /**
   * Validateur personnalisé pour vérifier l'âge minimum.
   * @param minAge L'âge minimum requis.
   */
  ageValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Ne pas valider si le champ est vide (laissé à 'required')
      }
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge ? null : { 'minAge': { requiredAge: minAge, actualAge: age } };
    };
  }

  /**
   * Validateur personnalisé pour vérifier si une date est dans le passé.
   */
  dateInPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Laissé à 'required'
      }
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Comparer uniquement les dates

      return selectedDate < today ? null : { 'dateNotInPast': true };
    };
  }

  /**
   * Validateur asynchrone pour vérifier si un numéro de permis existe déjà.
   */
  permisExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      return this.dbConnectService.checkPermisExists(control.value).pipe(
        map(exists => {
          if (exists) {
            // Le permis existe, on sauvegarde les données dans le localStorage 'Ifoundyou'
            const preneurData = this.autoForm.get('preneur')?.value;
            if (isPlatformBrowser(this.platformId)) {
              if (preneurData && preneurData.email && preneurData.telephone) {
                const contactInfo = { email: preneurData.email, telephone: preneurData.telephone };
                localStorage.setItem('Ifoundyou', JSON.stringify(contactInfo));
                console.log('Permis existant. Informations de contact sauvegardées dans Ifoundyou:', contactInfo);
              }
            }
            return { permisExists: true };
          }
          return null;
        }),
        catchError(() => of(null)) // En cas d'erreur serveur, on ne bloque pas le formulaire
      );
    };
  }

  /**
   * Validateur asynchrone pour vérifier si un email existe déjà.
   */
  emailExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      return this.dbConnectService.checkEmailExists(control.value).pipe(
        map(exists => {
          return exists ? { emailExists: true } : null;
        }),
        catchError(() => of(null)) // En cas d'erreur serveur, on ne bloque pas le formulaire
      );
    };
  }


  // --- Preneur d'assurance ---
  preneurPostalCode = '';
  preneurCity = '';
  preneurCities: string[] = [];
  filteredPreneurPostalCodes: PostalCode[] = [];

  // --- Conducteur principal ---
  conducteurCities: string[] = [];
  filteredConducteurPostalCodes: PostalCode[] = [];

  // --- Véhicule ---
  selectedMarque: Marque | null = null;
  filteredMarques: Marque[] = [];
  filteredModeles: Modele[] = [];

  // --- Logique de visibilité ---
  isConducteurDifferent = false;
  isLoading = false;
  isMarqueLoading = false;
  isModeleLoading = false;
  showModeleList = false;

  // --- Sujets pour la recherche avec debounce ---
  private marque$!: Subject<string>;
  private modele$!: Subject<string>;
  private destroy$ = new Subject<void>();

  submissionStatus: { success: boolean; message: string } | null = null;

  minDate: string;
  maxDate: string; // Pour la date max dans le template
  autoForm!: FormGroup; // Initialisé dans ngOnInit
  constructor(
    private dbConnectService: DbConnectService,
    private fb: FormBuilder,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];
    this.maxDate = today.toISOString().split('T')[0]; // Aujourd'hui est la date max
  }
  ngOnInit(): void {
    // Étape 1: Initialiser le formulaire EN DEHORS de la condition isPlatformBrowser.
    // La structure du formulaire est nécessaire pour le rendu côté serveur et client.
    this.autoForm = this.fb.group({
      preneur: this.fb.group({
        genre: [null, Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: ['', [Validators.required, this.ageValidator(14)]],
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]], // Le validateur asynchrone sera ajouté côté client
        adresse: ['', Validators.required],
        codePostal: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
        ville: ['', Validators.required],
        permis: ['', Validators.required],
        datePermis: ['', [Validators.required, this.dateInPastValidator()]],
      }),
      conducteurDifferent: [false],
      conducteur: this.fb.group({
        genre: [null],
        nom: [''],
        prenom: [''],
        dateNaissance: ['', this.ageValidator(14)],
        adresse: [''],
        codePostal: ['', Validators.pattern('^[0-9]{4}$')],
        ville: [''],
        permis: [''],
        datePermis: ['', this.dateInPastValidator()],
      }),
      vehicule: this.fb.group({
        type: ['', Validators.required],
        marque: ['', Validators.required],
        modele: ['', Validators.required],
        puissance: ['', Validators.required],
        places: ['', Validators.required],
        dateCirculation: ['', [Validators.required, this.dateInPastValidator()]],
        valeur: [''],
      }),
      garanties: this.fb.group({
        base: [false],
        omnium: [null], // 'non', 'partiel', 'total'
        conducteur: [false],
        assistance: [false]
      }),
      dateEffet: ['', Validators.required],
    });

    // Étape 2: Conserver toute la logique spécifique au navigateur (observables, événements)
    // à l'intérieur de la condition.
    if (isPlatformBrowser(this.platformId)) {
       // Ajouter le validateur asynchrone uniquement côté client
      const permisControl = this.autoForm.get('preneur.permis');
      if (permisControl) {
        permisControl.setAsyncValidators(this.permisExistsValidator());
      }

      const emailControl = this.autoForm.get('preneur.email');
      if (emailControl) {
        // Ajoute le validateur asynchrone aux validateurs existants
        emailControl.setAsyncValidators(this.emailExistsValidator());
      }

      this.modele$ = new Subject<string>();
      this.marque$ = new Subject<string>();

      // Gestion des codes postaux
      this.setupPostalCodeListener('preneur');
      this.setupPostalCodeListener('conducteur');


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
        switchMap(prefix => { // 'prefix' est la valeur de l'input, mais on va l'ignorer pour charger tous les modèles
          if (!this.selectedMarque) {
            return of([]); // Pas de marque sélectionnée, on ne charge rien
          }
          // On appelle le service avec un préfixe vide pour obtenir tous les modèles de la marque
          return this.dbConnectService.searchModeles(this.selectedMarque.marque_id, '');
        }),
        takeUntil(this.destroy$)
      ).subscribe(modeles => {
        this.filteredModeles = modeles;
        console.log('[Modele] Modèles reçus:', modeles);
        this.isModeleLoading = false;
      });

      this.autoForm.get('conducteurDifferent')?.valueChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe(isDifferent => {
        this.toggleConducteurValidators(isDifferent);
      });

    }
  }

  onMarqueInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.trim();
    // Exécuter uniquement dans le navigateur pour éviter de déclencher des observables côté serveur
    if (isPlatformBrowser(this.platformId)) {
      this.marque$.next(input);

      // Si le champ de la marque est vidé, on réinitialise le modèle.
      if (input === '') {
        this.selectedMarque = null;
        this.autoForm.get('vehicule.modele')?.setValue(''); // Correction: Mettre à jour le FormControl
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
   * Gère la sélection d'un code postal dans la liste d'autocomplétion.
   * @param selectedCity L'objet ville/code postal sélectionné.
   * @param type 'preneur' ou 'conducteur'.
   */
  selectPostalCode(selectedCity: PostalCode, type: 'preneur' | 'conducteur'): void {
    const formGroup = this.autoForm.get(type) as FormGroup;
    formGroup.get('codePostal')?.setValue(selectedCity.postalCode, { emitEvent: false });
    this.dbConnectService.getCitiesByPostalCode(selectedCity.postalCode).pipe(first()).subscribe(cities => {
      if (type === 'preneur') {
        this.preneurCities = cities;
        this.filteredPreneurPostalCodes = []; // Vide la liste d'autocomplétion
      } else { // 'conducteur'
        this.conducteurCities = cities;
        this.filteredConducteurPostalCodes = []; // Vide la liste d'autocomplétion
      }

      if (cities.length === 1) {
        formGroup.get('ville')?.setValue(cities[0]);
      } else {
        formGroup.get('ville')?.setValue(''); // Laisse l'utilisateur choisir
      }
    });
  }

  private setupPostalCodeListener(type: 'preneur' | 'conducteur'): void {
    const codePostalControl = this.autoForm.get(`${type}.codePostal`);
    const villeControl = this.autoForm.get(`${type}.ville`);

    if (!codePostalControl || !villeControl) return;

    codePostalControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.isLoading = true),
      switchMap(value => {
        if (value && value.length >= 2) {
          return this.dbConnectService.getPostalCodes(value);
        } else {
          if (type === 'preneur') this.filteredPreneurPostalCodes = [];
          else this.filteredConducteurPostalCodes = [];
          return of([]);
        }
      }),
      tap(() => {
        // Réinitialise la ville si le code postal change
        if (type === 'preneur') this.preneurCities = [];
        else this.conducteurCities = [];
        villeControl.setValue('', { emitEvent: false });
      }),
      takeUntil(this.destroy$)
    ).subscribe(codes => {
      this.isLoading = false;
      if (type === 'preneur') {
        this.filteredPreneurPostalCodes = codes;
      } else {
        this.filteredConducteurPostalCodes = codes;
      }
    });
  }

  selectMarque(marque: Marque): void {
    this.autoForm.get('vehicule.marque')?.setValue(marque.nom); // Met à jour le formControl
    this.selectedMarque = marque;
    this.filteredMarques = []; // Cache la liste des marques
    this.autoForm.get('vehicule.modele')?.setValue(''); // Réinitialise le formControl du modèle
    this.modele$.next(marque.nom); // Déclenche la recherche des modèles pour la marque sélectionnée
  }

  toggleModeleList(): void {
    // On ne montre la liste que si une marque est sélectionnée
    if (this.selectedMarque) {
      this.showModeleList = !this.showModeleList;
    }
  }

  onModeleInput(event: Event): void {
    // Cette méthode peut être utilisée si vous voulez ajouter une recherche par texte dans la liste des modèles
  }

  selectModele(modele: Modele): void {
    this.autoForm.get('vehicule.modele')?.setValue(modele.nom);
    this.filteredModeles = []; // Vide la liste pour la cacher
    this.showModeleList = false; // Cache la liste après la sélection
  }

  scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  onSubmit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.autoForm.valid) {
      this.submissionStatus = null; // Réinitialise le statut

      // Le numéro de permis n'existe pas (validé par l'async validator), on insère directement le devis en DB.
      this.dbConnectService.createFullDevis(this.autoForm.value).subscribe({
        next: (response) => {
          console.log('Devis enregistré avec succès', response);
          // Sauvegarder l'email et le téléphone dans le localStorage 'Ifoundyou'
          const preneurData = this.autoForm.get('preneur')?.value;
          if (preneurData && preneurData.email && preneurData.telephone) {
            const contactInfo = { email: preneurData.email, telephone: preneurData.telephone };
            localStorage.setItem('Ifoundyou', JSON.stringify(contactInfo));
            console.log('Informations de contact sauvegardées dans Ifoundyou:', contactInfo);
          }

          localStorage.removeItem('autoFormData'); // Nettoyer le localStorage
          this.submissionStatus = { success: true, message: 'Votre demande de devis a bien été enregistrée !' };
          // Optionnel : rediriger l'utilisateur ou réinitialiser le formulaire
          // this.autoForm.reset();
        },
        error: (err) => {
          console.error("Erreur lors de l'enregistrement du devis", err);
          this.submissionStatus = { success: false, message: "Une erreur est survenue lors de l'enregistrement de votre devis." };
        }
      });
    } else {
      this.markAllAsTouched(this.autoForm);
      this.submissionStatus = { success: false, message: 'Veuillez remplir tous les champs obligatoires avant de soumettre.' };
    }
  }

  private toggleConducteurValidators(isDifferent: boolean): void {
    const conducteurGroup = this.autoForm.get('conducteur') as FormGroup;
    if (isDifferent) {
      conducteurGroup.get('nom')?.setValidators(Validators.required);
      conducteurGroup.get('prenom')?.setValidators(Validators.required);
      conducteurGroup.get('dateNaissance')?.setValidators([Validators.required, this.ageValidator(14)]);
      conducteurGroup.get('adresse')?.setValidators(Validators.required);
      conducteurGroup.get('codePostal')?.setValidators([Validators.required, Validators.pattern('^[0-9]{4}$')]);
      conducteurGroup.get('ville')?.setValidators(Validators.required);
      // On ajoute le validateur requis ET le validateur asynchrone pour le permis du conducteur
      conducteurGroup.get('permis')?.setValidators([Validators.required]);
      conducteurGroup.get('permis')?.setAsyncValidators(this.permisExistsValidator());
      conducteurGroup.get('datePermis')?.setValidators([Validators.required, this.dateInPastValidator()]);
    } else {
      // On vide les champs et on retire tous les validateurs pour s'assurer que le groupe est valide.
      conducteurGroup.reset();
      // On réapplique les validateurs non-obligatoires qui doivent exister par défaut.
      // Important : On retire aussi le validateur asynchrone du permis.
      conducteurGroup.get('permis')?.setAsyncValidators(null);
      conducteurGroup.get('dateNaissance')?.setValidators(this.ageValidator(14));
      conducteurGroup.get('codePostal')?.setValidators(Validators.pattern('^[0-9]{4}$'));
      conducteurGroup.get('datePermis')?.setValidators(this.dateInPastValidator());
    }
    Object.keys(conducteurGroup.controls).forEach(key => {
      conducteurGroup.get(key)?.updateValueAndValidity();
    });
  }

  private markAllAsTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markAllAsTouched(control);
      }
    });
  }
}