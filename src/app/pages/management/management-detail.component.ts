import { Component, OnInit, inject, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormArray, FormGroup, FormsModule } from '@angular/forms';
import { DbConnectService, Assureur, Marque, AutoQuoteUpdatePayload, ObsequesQuoteUpdatePayload, HabitationQuoteUpdatePayload, Statut } from '../../services/db-connect.service';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, tap, finalize, catchError, toArray, startWith, takeUntil } from 'rxjs/operators';
import { IdCardFormatDirective } from '../../services/id-card-format.directive';
// import { NationalNumberFormatDirective } from '../../directives/national-number-format.directive';
import { LicensePlateFormatDirective } from '../../directives/license-plate-format.directive';
import { UploaderService, UploadResult } from '../../services/uploader.service';
import { ContractService, ContractPayload } from '../../services/contract.service';
 
import { SendsmsService } from '../../services/sendsms.service';
import { NationalNumberFormatDirective } from '../../directives/national-number-format.directive';
import { OmniumLevelPipe } from '../../pipes/omnium-level.pipe';
import { AutoFormComponent } from '../management/auto-form.component';
import { AutoDetailsComponent } from '../management/auto-details.component';
import { HabitationFormComponent } from '../management//habitation-form.component';
import { HabitationDetailsComponent } from '../management/habitation-details.component';

@Component({
  selector: 'app-management-detail',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    RouterLink,
    FormsModule,
    IdCardFormatDirective, 
    NationalNumberFormatDirective,
    LicensePlateFormatDirective,
    OmniumLevelPipe,
    AutoFormComponent,
    AutoDetailsComponent,
    HabitationFormComponent,
    HabitationDetailsComponent
  ],
  templateUrl: './management-detail.component.html',
  styleUrls: []
})
export class ManagementDetailComponent implements OnInit, OnDestroy {

  quoteDetails$!: Observable<{ [key: string]: any }>;
  private quoteDetails: any; // Pour stocker les détails actuels
  quoteType: string | null = null;
  quoteId: number | null = null;
  activeTab: 'form' | 'text' = 'form';
  csvData$: Observable<any[]> = of([]);

  // Propriétés pour la popup de notification
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  private popupTimeout: any; // Pour gérer le minuteur
  showMainDriverSection: boolean = false;
  nationalities$!: Observable<any[]>;
  preneurCities$ = new BehaviorSubject<string[]>([]);
  statuts$!: Observable<Statut[]>;
  conducteurCities$ = new BehaviorSubject<string[]>([]);
  batimentCities$ = new BehaviorSubject<string[]>([]);
  obsequesCities$ = new BehaviorSubject<string[]>([]);

  // FormControls pour l'auto-complétion de la marque
  marqueCtrl = new FormControl('');
  filteredMarques$!: Observable<any[]>;
  isMarqueLoading = false;
  isModeleLoading = false;

  // Liste complète des compagnies pour le select
  insuranceCompanies$!: Observable<Assureur[]>;
  private insuranceCompanies: Assureur[] = [];
  private destroy$ = new Subject<void>();

  // Tableau pour la liste des modèles
  modelesForSelectedMarque: any[] = [];
  selectedMarqueId: number | null = null;

  // Liste des années pour le sélecteur du véhicule
  vehicleYears: number[] = [];

  contractForm: FormGroup;
  quoteUpdateForm: FormGroup;

  today: string;

  constructor(
    private route: ActivatedRoute,
    private dbService: DbConnectService,
    private fb: FormBuilder,
    private uploaderService: UploaderService,
    private contractService: ContractService,
    private sendsmsService: SendsmsService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = ('0' + (todayDate.getMonth() + 1)).slice(-2);
    const day = ('0' + todayDate.getDate()).slice(-2);
    this.today = `${year}-${month}-${day}`;

    this.contractForm = this.fb.group({
      date_contrat: ['', Validators.required],
      periodicite: ['annuel', Validators.required],
      compagnie_id: [null, Validators.required],
      rappel: [false],
      fichiers_contrat: new FormControl<File[] | null>(null) // Pour gérer les fichiers téléversés
    });

    this.quoteUpdateForm = this.fb.group({
      preneurAssurance: this.fb.group({
        firstName: [''],
        lastName: [''],
        dateNaissance: [''],
        email: ['', Validators.email],
        phone: [''],
        address: [''],
        postalCode: [''],
        city: [null], // Changed to null for better select default
        driverLicenseNumber: [''],
        driverLicenseDate: [''],
        nationalRegistryNumber: ['', this.belgianNationalNumberValidator()],
        idCardNumber: [''], // Le validateur de groupe sera ajouté ci-dessous
        idCardValidityDate: [''],
        nationality: [''],
        maritalStatus: ['']
      }),
      preneurObseques: this.fb.group({
        firstName: [''],
        lastName: [''],
        dateNaissance: [''],
        email: ['', Validators.email],
        phone: [''],
        address: [''],
        postalCode: [''],
        city: [null], // Changed to null for better select default
      }),
      conducteurPrincipal: this.fb.group({
        // ... (champs identiques au preneur)
        firstName: [''],
        lastName: [''],
        dateNaissance: [''],
        email: ['', Validators.email],
        phone: [''],
        address: [''],
        postalCode: [''],
        city: [null], // Changed to null for better select default
        driverLicenseNumber: [''],
        driverLicenseDate: [''],
        nationalRegistryNumber: ['', this.belgianNationalNumberValidator()],
        idCardNumber: [''], // Le validateur de groupe sera ajouté ci-dessous
        idCardValidityDate: [''],
        nationality: [''],
        maritalStatus: ['']
      }),
      vehicule: this.fb.group({
        make: [''],
        model: [''],
        year: [''],
        licensePlate: ['']
      }),
      garantie: this.fb.group({
        baseRC: [false],
        omniumLevel: [''],
        driverCoverage: [false],
        assistance: [false],
        effectiveDate: [''],
        insuranceCompany: [null],
        statut: ['']
      }),
      garantiesHabitation: this.fb.group({
        contenu: [false],
        vol: [false],
        pertesIndirectes: [false],
        protectionJuridique: [false],
        assistance: [false],
        dateEffet: [''], // Note: date_effet is part of the main table, not a separate garanties table for habitation
        statut: [''],
        insuranceCompany: [null]
      }),
      batiment: this.fb.group({
        adresse: [''],
        codePostal: [''],
        ville: [null], // Changed to null for better select default
        typeMaison: [''],
      }),
      evaluation: this.fb.group({
        typeValeurBatiment: [''],
        superficie: [null],
        nombrePieces: [null],
        loyerMensuel: [null],
        typeValeurContenu: [''],
        valeurExpertise: [null],
        dateExpertise: ['']
      }),
      assures: this.fb.group({
        preneurEstAssure: [false],
        assures: this.fb.array([]),
        statut: [''],
        insuranceCompany: [null],
      }),
      detailsVoyage: this.fb.group({ // Ajout du groupe manquant
        description: [''],
        statut: [''],
      }),
      detailsRCFamiliale: this.fb.group({
        preneur_nom: [''],
        preneur_prenom: [''],
        preneur_genre: [''],
        preneur_telephone: [''],
        preneur_email: ['', Validators.email],
        preneur_adresse: [''],
        preneur_code_postal: [''],
        preneur_ville: [''],
        risque: [''],
        nationalRegistryNumber: ['', this.belgianNationalNumberValidator()],
        statut: [''],
        idCardNumber: [''],
        description: ['']
      })
    });
  }

  ngOnInit(): void {
    // Initialise la liste des années pour le sélecteur
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1940; year--) {
      this.vehicleYears.push(year);
    }

    // Ajout du validateur de groupe après l'initialisation du formulaire
    this.quoteUpdateForm.get('preneurAssurance')?.setValidators(this.nationalNumberDateConsistencyValidator());
    this.quoteUpdateForm.get('conducteurPrincipal')?.setValidators(this.nationalNumberDateConsistencyValidator());

    // Charge la liste complète des compagnies d'assurance pour la liste déroulante
    this.subscribeToInsuranceCompanies();

    // Charge la liste des nationalités pour les listes déroulantes
    this.nationalities$ = this.dbService.getNationalities();

    // Charge la liste des statuts pour les listes déroulantes
    this.statuts$ = this.dbService.getAllStatuts();

    if (isPlatformBrowser(this.platformId)) {
      const preneurPostalCodeControl = this.quoteUpdateForm.get('preneurAssurance.postalCode');
      if (preneurPostalCodeControl) {
        preneurPostalCodeControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),          
          switchMap(pc => pc && pc.length >= 4 ? this.dbService.getCitiesByPostalCode(pc) : of([])),          
        ).subscribe(cities => {
          this.preneurCities$.next(cities);
          // On vérifie si la ville actuelle est dans la nouvelle liste. Sinon, on la réinitialise.
          const cityControl = this.quoteUpdateForm.get('preneurAssurance.city');
          const currentCity = cityControl?.value;
          if (currentCity && !cities.includes(currentCity)) {
            cityControl.reset();
          }          
        });
      }

    }

    // Logique d'auto-complétion pour la marque du véhicule
    this.filteredMarques$ = this.marqueCtrl.valueChanges.pipe(
      startWith(''), // Déclenche le pipe immédiatement et lors des réinitialisations
      debounceTime(300),
      distinctUntilChanged(),
      tap((value) => {
        const searchTerm = typeof value === 'string' ? value : (value as unknown as Marque)?.nom || '';
        // Si le champ est vidé ou si on tape, on réinitialise le modèle.
        if (!value || typeof value === 'string') {
          this.quoteUpdateForm.get('vehicule.model')?.setValue('');
          this.modelesForSelectedMarque = [];
          this.selectedMarqueId = null;
        }
        this.isMarqueLoading = searchTerm.length >= 2;
      }),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : (value as unknown as Marque)?.nom || '';
        if (searchTerm.length >= 2) {
          return this.dbService.searchMarques(searchTerm).pipe(
            finalize(() => this.isMarqueLoading = false)
          );
        }
        this.isMarqueLoading = false; // S'assurer que le loader est désactivé
        return of([]); // Retourne une liste vide si pas assez de caractères
      })
    );

    // Synchroniser le FormControl de recherche avec le formulaire principal
    this.marqueCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.quoteUpdateForm.get('vehicule.make')?.setValue(value, { emitEvent: false });
    });

    this.quoteDetails$ = this.getQuoteDetailsFromRoute();

    // Charger les données CSV associées à ce devis
    this.csvData$ = this.route.paramMap.pipe(
      switchMap(params => {
        const type = params.get('type');
        const id = Number(params.get('id'));
        if (type && id) {
          return this.dbService.getCsvData(id, type);
        }
        return of([]); // Retourne un tableau vide si les paramètres sont manquants
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private patchFormValues(details: any): Observable<any> {    
    // Chaîne d'observables pour les chargements de données asynchrones post-patch
    const preneurPostalCode = this.quoteUpdateForm.get("preneurAssurance.postalCode")?.value;
    const batimentPostalCode = this.quoteUpdateForm.get('batiment.codePostal')?.value;
    const obsequesPostalCode = this.quoteUpdateForm.get('preneurObseques.postalCode')?.value;
    const marqueVehicule = details.vehicule?.marque;

    const preneurCities$ = (isPlatformBrowser(this.platformId) && preneurPostalCode)
      ? this.dbService.getCitiesByPostalCode(preneurPostalCode).pipe(tap(cities => this.preneurCities$.next(cities)))
      : of(null);

    const batimentCities$ = (isPlatformBrowser(this.platformId) && batimentPostalCode)
      ? this.dbService.getCitiesByPostalCode(batimentPostalCode).pipe(tap(cities => this.batimentCities$.next(cities)))
      : of(null);

    const obsequesCities$ = (isPlatformBrowser(this.platformId) && obsequesPostalCode)
      ? this.dbService.getCitiesByPostalCode(obsequesPostalCode).pipe(tap(cities => this.obsequesCities$.next(cities)))
      : of(null);

    const modeles$ = (isPlatformBrowser(this.platformId) && this.quoteType === 'auto' && marqueVehicule)
      ? this.dbService.searchMarques(marqueVehicule).pipe(
          switchMap(marques => {
            if (marques && marques.length > 0) {
              const marqueTrouvee = marques[0];
              this.selectedMarqueId = marqueTrouvee.marque_id;
              this.isModeleLoading = true;
              return this.dbService.searchModeles(this.selectedMarqueId).pipe(
                tap(modeles => {
                  // 1. On charge la liste des modèles
                  this.modelesForSelectedMarque = modeles;
                  // 2. ENSUITE, on patch la valeur du modèle dans le formulaire pour que la sélection se fasse.
                  this.quoteUpdateForm.get('vehicule.model')?.patchValue(details.vehicule.modele, { emitEvent: false });
                }),
                finalize(() => this.isModeleLoading = false)
              );
            }
            return of(null);
          })
        )
      : of(null);

    // Combine all observables. They will run in parallel.
    // The `patchFormValues` observable will complete when all of them have completed.
    return of(details).pipe(
      switchMap(() => Promise.all([preneurCities$, batimentCities$, obsequesCities$, modeles$]))
    );
  }

  private _patchCommonPreneur(details: any, formatDate: (dateStr: string | null | undefined) => string | null) {
    const preneurData = details.preneur || details;
    if (preneurData) {
      this.quoteUpdateForm.get('preneurAssurance')?.patchValue({
        firstName: preneurData.prenom,
        lastName: preneurData.nom,
        dateNaissance: formatDate(preneurData.date_naissance),
        email: preneurData.email,
        phone: preneurData.telephone,
        address: preneurData.adresse,
        postalCode: preneurData.code_postal,
        city: preneurData.ville,
        driverLicenseNumber: preneurData.permis_numero,
        driverLicenseDate: formatDate(preneurData.permis_date),
        nationalRegistryNumber: preneurData.numero_national,
        idCardNumber: preneurData.idcard_number,
        idCardValidityDate: formatDate(preneurData.idcard_validity),
        nationality: preneurData.nationality,
        maritalStatus: preneurData.marital_status
      });
    }
  }

  private _patchAuto(details: any, formatDate: (dateStr: string | null | undefined) => string | null) {
    this._patchCommonPreneur(details, formatDate);

    this.showMainDriverSection = details.preneur_id !== details.conducteur_id;
    if (this.showMainDriverSection && details.conducteur) {
      this.quoteUpdateForm.get('conducteurPrincipal')?.patchValue({
        firstName: details.conducteur.prenom,
        lastName: details.conducteur.nom,
        dateNaissance: formatDate(details.conducteur.date_naissance),
        email: details.conducteur.email,
        phone: details.conducteur.telephone,
        address: details.conducteur.adresse,
        postalCode: details.conducteur.code_postal,
        city: details.conducteur.ville,
        driverLicenseNumber: details.conducteur.permis_numero,
        driverLicenseDate: formatDate(details.conducteur.permis_date),
        nationalRegistryNumber: details.conducteur.numero_national,
        idCardNumber: details.conducteur.idcard_number,
        idCardValidityDate: formatDate(details.conducteur.idcard_validity),
        nationality: details.conducteur.nationality,
        maritalStatus: details.conducteur.marital_status
      });
    }

    if (details.vehicule) {
      this.quoteUpdateForm.get('vehicule')?.patchValue({
        make: details.vehicule.marque,
        model: details.vehicule.modele,
        year: details.vehicule.annee,
        licensePlate: details.vehicule.plaque
      });
      this.marqueCtrl.setValue(details.vehicule.marque || '', { emitEvent: false });
    }

    this.quoteUpdateForm.get('garantie')?.patchValue({
      baseRC: details.garantie_base_rc,
      omniumLevel: details.garantie_omnium_niveau,
      driverCoverage: details.garantie_conducteur,
      assistance: details.garantie_assistance,
      effectiveDate: formatDate(details.date_effet),
      insuranceCompany: details.compagnie_id,
      statut: details.statut
    });
  }

  private _patchHabitation(details: any, formatDate: (dateStr: string | null | undefined) => string | null) {
    this._patchCommonPreneur(details, formatDate);

    this.quoteUpdateForm.get('batiment')?.patchValue({
      adresse: details.batiment_adresse,
      codePostal: details.batiment_code_postal,
      ville: details.batiment_ville,
      typeMaison: details.batiment_type_maison,
    });
    this.quoteUpdateForm.get('evaluation')?.patchValue({
      typeValeurBatiment: details.evaluation_type_valeur_batiment,
      superficie: details.evaluation_superficie,
      nombrePieces: details.evaluation_nombre_pieces,
      loyerMensuel: details.evaluation_loyer_mensuel,
      typeValeurContenu: details.evaluation_type_valeur_contenu,
      valeurExpertise: details.evaluation_valeur_expertise,
      dateExpertise: formatDate(details.evaluation_date_expertise)
    });
    this.quoteUpdateForm.get('garantiesHabitation')?.patchValue({
      contenu: details.garantie_contenu,
      vol: details.garantie_vol,
      pertesIndirectes: details.garantie_pertes_indirectes,
      protectionJuridique: details.garantie_protection_juridique,
      assistance: details.garantie_assistance,
      dateEffet: formatDate(details.date_effet),
      statut: details.statut,
      insuranceCompany: details.compagnie_id
    });
  }

  private _patchObseques(details: any, formatDate: (dateStr: string | null | undefined) => string | null) {
    const preneurObsData = details.preneur || details;
    this.quoteUpdateForm.get('preneurObseques')?.patchValue({
      firstName: preneurObsData.prenom,
      lastName: preneurObsData.nom,
      dateNaissance: formatDate(preneurObsData.date_naissance),
      email: preneurObsData.email,
      phone: preneurObsData.telephone,
      address: preneurObsData.adresse,
      postalCode: preneurObsData.code_postal,
      city: preneurObsData.ville,
    });
    this.quoteUpdateForm.get('assures.preneurEstAssure')?.setValue(details.preneur_est_assure);
    this.quoteUpdateForm.get('assures.statut')?.setValue(details.statut);
    this.quoteUpdateForm.get('assures.insuranceCompany')?.setValue(details.compagnie_id);
    const assuresData = (details.assures || []) as any[];
    this.assures.clear();
    assuresData.forEach(assure => this.assures.push(this.createAssureFormGroup({ ...assure, dateNaissance: formatDate(assure.dateNaissance) })));
  }

  // Remplacez l'ancienne méthode getQuoteDetailsFromRoute par celle-ci
  private getQuoteDetailsFromRoute(): Observable<any> {
    return this.route.paramMap.pipe(
      switchMap(params => {
        this.quoteType = params.get('type');
        this.quoteId = Number(params.get('id'));

        if (this.quoteType && this.quoteId) {
          return this.dbService.getQuoteDetails(this.quoteType, this.quoteId);
        }
        return of(null);
      }),
      switchMap(details => {
        if (details) {
          this.quoteDetails = details; // Stocker les détails
          const formatDate = (dateStr: string | null | undefined) => dateStr ? this.formatDateForInput(dateStr) : null;

          switch (this.quoteType) {
            case 'auto':
              this._patchAuto(details, formatDate);
              break;
            case 'habitation':
              this._patchHabitation(details, formatDate);
              break;
            case 'obseques':
              this._patchObseques(details, formatDate);
              break;
            case 'voyage':
              this.quoteUpdateForm.get('detailsVoyage')?.patchValue({ description: details.description, statut: details.statut });
              break;
            case 'rc':
              this._patchCommonPreneur(details, formatDate);
              this.quoteUpdateForm.get('detailsRCFamiliale')?.patchValue({ ...details, nationalRegistryNumber: details.numero_national });
              break;
          }

          // patchFormValues retourne maintenant un Observable que nous pouvons chaîner
          return this.patchFormValues(details).pipe(
            map(() => details) // Retourne les détails originaux une fois le patch terminé
          );
        }
        return of(null);
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des détails du devis:', error);
        return of(null);
      })
    );
  }

  // Getter pour un accès facile au FormArray des assurés
  get assures(): FormArray {
    return this.quoteUpdateForm.get('assures.assures') as FormArray;
  }

  // Crée un FormGroup pour un assuré
  createAssureFormGroup(assure: any = {}): FormGroup {
    return this.fb.group({
      nom: [assure.nom || '', Validators.required],
      prenom: [assure.prenom || '', Validators.required],
      dateNaissance: [assure.dateNaissance || '', Validators.required],
      capital: [assure.capital || 0, [Validators.required, Validators.min(1)]]
    });
  }

  // Ajoute un nouvel assuré au FormArray
  addAssure(): void {
    this.assures.push(this.createAssureFormGroup());
  }

  selectMarque(marque: any) {
    this.selectedMarqueId = marque.marque_id;
    // Mettre à jour le formulaire principal avec le nom de la marque
    this.quoteUpdateForm.get('vehicule.make')?.setValue(marque.nom, { emitEvent: false });
    // Mettre à jour le contrôle de l'autocomplete avec le nom (string), et non l'objet
    this.marqueCtrl.setValue(marque.nom);

    // Réinitialise le champ modèle et charge la nouvelle liste
    this.quoteUpdateForm.get('vehicule.model')?.reset(''); // Utiliser reset pour vider et marquer comme pristine
    this.modelesForSelectedMarque = [];
    this.isModeleLoading = true; // Active le loader
    if (this.selectedMarqueId !== null) {
      this.dbService.searchModeles(this.selectedMarqueId).pipe(
        finalize(() => this.isModeleLoading = false) // Désactive le loader à la fin
      ).subscribe(modeles => {
        this.modelesForSelectedMarque = modeles;
      });
    }
    // Vide la liste de suggestions
    this.filteredMarques$ = of([]);
  }

  // Fonction pour mettre en majuscule la première lettre et ajouter des espaces
  private formatAsTitle(text: string): string {
    if (!text) return '';
    const result = text.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Formate une date (string ou Date) en 'yyyy-MM-dd' pour les inputs
  private formatDateForInput(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // Gère la sélection de fichiers pour le contrat
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;    
    const files = input.files ? Array.from(input.files) : null;
    this.contractForm.patchValue({ fichiers_contrat: files });
  }


  saveContract() {
    if (this.contractForm.invalid) {
      console.log('Le formulaire est invalide.');
      return;
    }

    if (!this.quoteId || !this.quoteType) {
      console.error("L'ID ou le type de devis est manquant, impossible de sauvegarder le contrat.");
      return;
    }

    const contractValue = this.contractForm.value;
    const originalFiles = contractValue.fichiers_contrat;

    let filesToUpload: File[] = [];
    if (originalFiles && originalFiles.length > 0) {
      // La logique de renommage est déplacée ici pour garantir que quoteId et quoteType sont disponibles.
      const date = new Date();
      const formattedDate = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
      const baseName = `${this.quoteId}_${this.quoteType}_${formattedDate}`;

      filesToUpload = originalFiles.map((originalFile: File, i: number) => {
        const fileExtension = originalFile.name.split('.').pop();
        const newName = `${baseName}_${i + 1}.${fileExtension}`;
        return new File([originalFile], newName, { type: originalFile.type });
      });
    }

    // Crée un observable qui gère le téléversement. S'il n'y a pas de fichiers, il émet un tableau vide.
    const upload$ = (filesToUpload.length > 0)
      ? this.uploaderService.uploadContractFiles(filesToUpload, this.quoteId, this.quoteType).pipe(
          toArray() // Collecte tous les résultats de téléversement en un seul tableau
        )
      : of([]); // Émet un tableau vide s'il n'y a pas de fichiers

    upload$.pipe(
      map((results: (UploadResult | null)[]) => 
        // Filtre les résultats pour ne garder que les succès et extrait leurs chemins.
        // Le `filter(Boolean)` retire les `null` potentiels du tableau.
        results.filter((r): r is UploadResult => !!r && r.status === 'success')
               .map(r => r.path!)
      ),
      switchMap(successfulPaths => {
        console.log('Fichiers téléversés avec succès:', successfulPaths);
        // Prépare les données à sauvegarder dans votre base de données.
        const contractPayload: ContractPayload = {
          quote_id: this.quoteId!,
          quote_type: this.quoteType!,
          compagnie_id: contractValue.compagnie_id!,
          date_contrat: contractValue.date_contrat!,
          periodicite: contractValue.periodicite!,
          rappel: contractValue.rappel!,
          document_paths: successfulPaths, // Ajoute les chemins des documents
          uid: crypto.randomUUID() // Ajoute un identifiant unique pour la ligne
        };

        console.log('Données du contrat à sauvegarder:', contractPayload);
        // Ici, vous appelez le service pour sauvegarder les données du contrat dans votre BDD.
        return this.contractService.saveContractData(contractPayload);
      }),
      catchError(error => {
        console.error('Une erreur est survenue lors du téléversement ou de la sauvegarde:', error);
        // Affichez une notification d'erreur à l'utilisateur ici.
        return of({ success: false, error });
      })
    ).subscribe(result => {
      if (result && !result.error) {
        console.log('Contrat enregistré avec succès !');
        // Vous pouvez réinitialiser le formulaire ou naviguer vers une autre page ici.
      } else {
        console.error('Échec de l\'enregistrement du contrat.', result?.error);
      }
    });
  }

  printQuote(): void {
    const printContent = document.getElementById('printable-section');
    if (printContent) {
      const WindowPrt = window.open('', '', 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
      if (WindowPrt) {
        // Les styles TailwindCSS peuvent ne pas être disponibles directement.
        // Une meilleure approche pour la production serait de lier une feuille de style.
        // Pour la simplicité, nous injectons quelques styles de base.
        const styles = `
          <style>
            body { font-family: sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .font-bold { font-weight: 700; }
            .uppercase { text-transform: uppercase; }
          </style>
        `;
        WindowPrt.document.write('<html><head><title>Imprimer</title>' + styles + '</head><body>' + printContent.innerHTML + '</body></html>');
        WindowPrt.document.close();
        WindowPrt.focus();
        WindowPrt.print();
        WindowPrt.close();
      }
    }
  }

  updateQuoteDetails() {
    if (!this.quoteUpdateForm.valid) {
      console.error('Le formulaire de mise à jour est invalide.');
      // Optionnel: marquer tous les champs comme "touchés" pour afficher les erreurs
      this.quoteUpdateForm.markAllAsTouched();
      return;
    }

    const formValue = this.quoteUpdateForm.value;

    // Logique d'envoi de SMS
    const newStatus = formValue.garantie?.statut;
    const oldStatus = this.quoteDetails?.statut;
    const phoneNumber = formValue["preneurAssurance"]?.phone;

    if (this.quoteType === 'auto' && newStatus === 'Nouveau' && oldStatus !== 'Nouveau' && phoneNumber) {
      const message = "AssurKin: Un nouveau document relatif à l'assurance automobile est disponible dans votre espace";
      console.log(`Envoi du SMS au ${phoneNumber}`);
      this.sendsmsService.sendSms(phoneNumber, message)
        .then(() => console.log('SMS envoyé avec succès.'))
        .catch(error => console.error("Erreur lors de l'envoi du SMS:", error));
    }
    // Fin de la logique d'envoi de SMS

    if (this.quoteType === 'auto') {
      const payload: AutoQuoteUpdatePayload = {
        p_preneur: formValue["preneurAssurance"]!,
        p_vehicule: formValue['vehicule']!,
        p_devis: {
          garantie_base_rc: formValue.garantie?.baseRC ?? false,
          garantie_omnium_niveau: formValue.garantie?.omniumLevel ?? '',
          garantie_conducteur: formValue.garantie?.driverCoverage ?? false,
          garantie_assistance: formValue.garantie?.assistance ?? false,
          date_effet: formValue.garantie?.effectiveDate ? this.formatDateForInput(formValue.garantie.effectiveDate) : '',
          compagnie_id: formValue.garantie?.insuranceCompany,
          statut: formValue.garantie?.statut
        }
      };
      if (this.showMainDriverSection) {
        payload.p_conducteur = formValue['conducteurPrincipal']!;
      }
      this.executeUpdate(this.dbService.updateAutoQuote(this.quoteId!, payload));

    } else if (this.quoteType === 'obseques') {
      const assuresValue = this.assures.value.map((assure: any) => ({
        ...assure,
        dateNaissance: assure.dateNaissance ? this.formatDateForInput(assure.dateNaissance) : null
      }));

      const payload: ObsequesQuoteUpdatePayload = {
        preneur: {
          ...formValue["preneurObseques"]!,
          dateNaissance: formValue["preneurObseques"]?.dateNaissance ? this.formatDateForInput(formValue["preneurObseques"].dateNaissance) : null
        },
        devis: {
          preneur_est_assure: formValue.assures?.preneurEstAssure ?? false,
          assures: assuresValue,
          nombre_assures: assuresValue.length,
          statut: formValue.assures?.statut,
          compagnie_id: formValue.assures?.insuranceCompany
        }
      };
      this.executeUpdate(this.dbService.updateObsequesQuote(this.quoteId!, payload));
    } else if (this.quoteType === 'habitation') {
        const payload: HabitationQuoteUpdatePayload = {
            p_preneur: formValue["preneurAssurance"]!,
            p_devis: {
                batiment_adresse: formValue.batiment?.adresse,
                batiment_code_postal: formValue.batiment?.codePostal,
                batiment_ville: formValue.batiment?.ville,
                batiment_type_maison: formValue.batiment?.typeMaison,
                evaluation_type_valeur_batiment: formValue.evaluation?.typeValeurBatiment,
                evaluation_superficie: formValue.evaluation?.superficie,
                evaluation_nombre_pieces: formValue.evaluation?.nombrePieces,
                evaluation_loyer_mensuel: formValue.evaluation?.loyerMensuel,
                evaluation_type_valeur_contenu: formValue.evaluation?.typeValeurContenu,
                evaluation_valeur_expertise: formValue.evaluation?.valeurExpertise,
                evaluation_date_expertise: formValue.evaluation?.dateExpertise ? this.formatDateForInput(formValue.evaluation.dateExpertise) : null,
                garantie_contenu: formValue['garantiesHabitation']?.contenu,
                garantie_vol: formValue['garantiesHabitation']?.vol,
                garantie_pertes_indirectes: formValue['garantiesHabitation']?.pertesIndirectes,
                garantie_protection_juridique: formValue['garantiesHabitation']?.protectionJuridique,
                garantie_assistance: formValue['garantiesHabitation']?.assistance,
                date_effet: formValue['garantiesHabitation']?.dateEffet ? this.formatDateForInput(formValue['garantiesHabitation'].dateEffet) : null,
                statut: formValue['garantiesHabitation']?.statut,
                compagnie_id: formValue['garantiesHabitation']?.insuranceCompany
            }
        };
        this.executeUpdate(this.dbService.updateHabitationQuote(this.quoteId!, payload));
    
    // NOTE: La logique de mise à jour pour 'rc' et 'voyage' n'est pas encore implémentée.
    } else {
      console.error(`Le type de devis '${this.quoteType}' n'est pas supporté pour la mise à jour.`);
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    
    // On s'assure de nettoyer un éventuel minuteur précédent
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
    
    // Masquer la popup après 5 secondes
    this.popupTimeout = setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  public hideNotification(): void {
    this.showPopup = false;
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
  }

  private executeUpdate(updateObservable: Observable<{ success: boolean, error?: any, data?: any }>): void {
    console.log('Envoi des données de mise à jour...');
    updateObservable.pipe(
        catchError(error => {
          console.error('Erreur lors de la mise à jour du devis:', error);
          this.showNotification('Erreur lors de la mise à jour du devis.', 'error');
          return of({ success: false, error });
        })
      ).subscribe(response => {
        if (response && response.success) {
          console.log('Devis mis à jour avec succès !', response);
          this.quoteUpdateForm.markAsPristine(); // Réinitialise l'état du formulaire pour désactiver le bouton
          this.showNotification('Devis mis à jour avec succès !', 'success');
        } else {
          this.showNotification("La mise à jour du devis a échoué. " + (response?.error?.message || ''), 'error');
        }
      });
  }

  /**
   * Validateur de groupe pour vérifier la cohérence entre la date de naissance et le numéro national.
   */
  private nationalNumberDateConsistencyValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const dateNaissanceControl = group.get('dateNaissance');
      const nationalRegistryNumberControl = group.get('nationalRegistryNumber');

      // Ne rien faire si les champs ne sont pas remplis ou invalides
      if (!dateNaissanceControl?.value || !nationalRegistryNumberControl?.value || nationalRegistryNumberControl.invalid) {
        // Si une erreur de cohérence existait, on la retire
        if (nationalRegistryNumberControl?.hasError('dateMismatch')) {
          const errors = { ...nationalRegistryNumberControl.errors };
          delete errors['dateMismatch'];
          nationalRegistryNumberControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
        return null;
      }

      const dateNaissanceValue = new Date(dateNaissanceControl.value);
      const digitsOnly = nationalRegistryNumberControl.value.replace(/\D/g, '');

      const nnYear = parseInt(digitsOnly.substring(0, 2), 10);
      const nnMonth = parseInt(digitsOnly.substring(2, 4), 10);
      const nnDay = parseInt(digitsOnly.substring(4, 6), 10);

      // Détermine si l'année est 19xx ou 20xx en se basant sur le siècle de la date de naissance entrée
      const birthCentury = Math.floor(dateNaissanceValue.getFullYear() / 100) * 100;
      const nnFullYear = birthCentury + nnYear;

      const nnDate = new Date(nnFullYear, nnMonth - 1, nnDay);

      // Compare les dates en ignorant l'heure
      dateNaissanceValue.setHours(0, 0, 0, 0);
      nnDate.setHours(0, 0, 0, 0);

      if (dateNaissanceValue.getTime() !== nnDate.getTime()) {
        nationalRegistryNumberControl.setErrors({ ...nationalRegistryNumberControl.errors, dateMismatch: true });
        return { dateMismatch: true }; // Retourne l'erreur sur le groupe
      }

      return null;
    };
  }
  /**
   * Validateur personnalisé pour le numéro national belge.
   * Vérifie le format et la somme de contrôle.
   */
  private belgianNationalNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {      
      if (!control.value) {
        return null; // Ne pas valider si le champ est vide
      }

      // 1. Nettoyer la valeur pour ne garder que les chiffres
      const digitsOnly = control.value.replace(/\D/g, '');

      if (digitsOnly.length !== 11) {
        return { invalidFormat: true };
      }

      // 2. Extraire les parties du numéro
      const year = parseInt(digitsOnly.substring(0, 2), 10);
      const month = parseInt(digitsOnly.substring(2, 4), 10);
      const day = parseInt(digitsOnly.substring(4, 6), 10);
      const baseNumberStr = digitsOnly.substring(0, 9);
      const checkDigit = parseInt(digitsOnly.substring(9, 11), 10);

      // 3. Vérification de la validité de la date
      // On essaie pour les années 1900 et 2000
      const date1900 = new Date(1900 + year, month - 1, day);
      const date2000 = new Date(2000 + year, month - 1, day);

      const isDate1900Valid = date1900.getFullYear() === 1900 + year && date1900.getMonth() === month - 1 && date1900.getDate() === day;
      const isDate2000Valid = date2000.getFullYear() === 2000 + year && date2000.getMonth() === month - 1 && date2000.getDate() === day;

      if (!isDate1900Valid && !isDate2000Valid) {
        return { invalidDate: true };
      }

      // 4. Vérification de la somme de contrôle (checksum)
      const baseNumber = parseInt(baseNumberStr, 10);
      const calculatedCheckDigit = 97 - (baseNumber % 97);

      // Pour les naissances à partir de 2000, un '2' est préfixé au numéro de base pour le calcul.
      const baseNumberFor2000 = parseInt('2' + baseNumberStr, 10);
      const calculatedCheckDigitFor2000 = 97 - (baseNumberFor2000 % 97);      

      if (checkDigit !== calculatedCheckDigit && checkDigit !== calculatedCheckDigitFor2000) {
        return { invalidChecksum: true };
      }

      return null; // Valide
    };
  }

  private subscribeToInsuranceCompanies(): void {
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();
    this.insuranceCompanies$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(companies => {
      if (companies) {
        this.insuranceCompanies = companies;
      }
    });
  }

  getCompanyName(companyId: number): string {
    if (!companyId || !this.insuranceCompanies || this.insuranceCompanies.length === 0) {
      return 'N/A';
    }
    const company = this.insuranceCompanies.find(c => c.id === companyId);
    return company ? company.nom : `Inconnue (ID: ${companyId})`;
  }

  public getStatutClass(statut: string | null | undefined): { [key: string]: boolean } {
    if (!statut) {
      return { 'bg-gray-100': true, 'text-gray-800': true };
    }
    switch (statut) {
      case 'Nouveau':
      case 'En cours de traitement':
        return { 'bg-blue-100': true, 'text-blue-800': true };
      case 'En attente':
      case 'En cours':
        return { 'bg-yellow-100': true, 'text-yellow-800': true };
      case 'Terminé':
        return { 'bg-green-100': true, 'text-green-800': true };
      case 'Refusé':
      case 'Inactif':
        return { 'bg-red-100': true, 'text-red-800': true };
      default:
        return { 'bg-gray-100': true, 'text-gray-800': true }; // Classe par défaut
    }
  }

  // Fonctions utilitaires pour l'affichage des données CSV
  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }


}