import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormArray, FormGroup } from '@angular/forms';
import { DbConnectService, Assureur } from '../../services/db-connect.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, tap, finalize, catchError } from 'rxjs/operators';
import { IdCardFormatDirective } from '../../services/id-card-format.directive';
// import { NationalNumberFormatDirective } from '../../directives/national-number-format.directive';
import { LicensePlateFormatDirective } from '../../directives/license-plate-format.directive';
import { UploaderService } from '../../services/uploader.service';
import { ContractService, ContractPayload } from '../../services/contract.service';

// Interface pour le payload de mise à jour du devis auto
// pour correspondre à la structure attendue par le service de mise à jour.
interface AutoQuoteUpdatePayload {
  preneur: { [key: string]: any };
  conducteur?: { [key: string]: any };
  vehicule: { [key: string]: any };
  devis: {
    garantie_base_rc: boolean;
    garantie_omnium_niveau: string;
    garantie_conducteur: boolean;
    garantie_assistance: boolean;
    date_effet: string;
  };
}

interface ObsequesQuoteUpdatePayload {
  preneur: { [key: string]: any };
  devis: {
    preneur_est_assure: boolean;
    assures: any[];
    nombre_assures: number;
  };
}

@Component({
  selector: 'app-management-detail',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterLink,
    IdCardFormatDirective, 
    // NationalNumberFormatDirective, 
    // LicensePlateFormatDirective
  ],
  templateUrl: './management-detail.component.html',
  styleUrls: []
})
export class ManagementDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dbService = inject(DbConnectService);
  private fb = inject(FormBuilder);
  private uploaderService = inject(UploaderService);
  private contractService = inject(ContractService);

  quoteDetails$!: Observable<{ [key: string]: any }>;
  quoteType: string | null = null;
  quoteId: number | null = null;
  showMainDriverSection: boolean = false;
  nationalities$!: Observable<any[]>;

  // FormControls pour l'auto-complétion de la marque
  marqueCtrl = new FormControl('');
  filteredMarques$!: Observable<any[]>;
  isMarqueLoading = false;
  isModeleLoading = false;

  // Liste complète des compagnies pour le select
  allCompagnies$!: Observable<Assureur[]>;

  // Tableau pour la liste des modèles
  modelesForSelectedMarque: any[] = [];
  selectedMarqueId: number | null = null;

  // Liste des années pour le sélecteur du véhicule
  vehicleYears: number[] = [];

  contractForm = this.fb.group({
    date_contrat: ['', Validators.required],
    periodicite: ['annuel', Validators.required],
    compagnie_id: [null, Validators.required],
    rappel: [false],
    fichiers_contrat: new FormControl<File[] | null>(null) // Pour gérer les fichiers téléversés
  });

  // Formulaire unique pour la mise à jour des Détails de l'offre
  quoteUpdateForm = this.fb.group({
    'Preneur d\'assurance': this.fb.group({
      firstName: [''],
      lastName: [''],
      dateNaissance: [''],
      email: ['', Validators.email],
      phone: [''],
      address: [''],
      postalCode: [''],
      city: [''],
      driverLicenseNumber: [''],
      driverLicenseDate: [''],
      nationalRegistryNumber: ['', this.belgianNationalNumberValidator()],
      idCardNumber: [''],
      idCardValidityDate: [''],
      nationality: [''],
      maritalStatus: ['']
    }),
    'Preneur Obsèques': this.fb.group({
      firstName: [''],
      lastName: [''],
      dateNaissance: [''],
      email: ['', Validators.email],
      phone: [''],
      address: [''],
      postalCode: [''],
      city: [''],
    }),
    'Conducteur principal': this.fb.group({
      // ... (champs identiques au preneur)
      firstName: [''],
      lastName: [''],
      dateNaissance: [''],
      email: ['', Validators.email],
      phone: [''],
      address: [''],
      postalCode: [''],
      city: [''],
      driverLicenseNumber: [''],
      driverLicenseDate: [''],
      nationalRegistryNumber: ['', this.belgianNationalNumberValidator()],
      idCardNumber: [''],
      idCardValidityDate: [''],
      nationality: [''],
      maritalStatus: ['']
    }),
    'Véhicule': this.fb.group({
      make: [''],
      model: [''],
      year: [''],
      licensePlate: ['']
    }),
    'Garantie': this.fb.group({
      baseRC: [false],
      omniumLevel: [''],
      driverCoverage: [false],
      assistance: [false],
      effectiveDate: ['']
    }),
    'Garanties Habitation': this.fb.group({
      contenu: [false],
      vol: [false],
      pertesIndirectes: [false],
      protectionJuridique: [false],
      assistance: [false],
      dateEffet: ['']
    }),
    'Bâtiment': this.fb.group({
      adresse: [''],
      codePostal: [''],
      ville: [''],
      typeMaison: [''],
    }),
    'Évaluation': this.fb.group({
      typeValeurBatiment: [''],
      superficie: [null],
      nombrePieces: [null],
      loyerMensuel: [null],
      typeValeurContenu: [''],
      valeurExpertise: [null],
      dateExpertise: ['']
    }),
    'Assurés': this.fb.group({
      preneurEstAssure: [false],
      assures: this.fb.array([])
    }),
    description: [''], // Ajout du champ description pour le voyage

    'Détails RC Familiale': this.fb.group({
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
      idCardNumber: [''],
      description: ['']
    })
    // D'autres groupes peuvent être ajoutés ici au besoin
  });

  ngOnInit(): void {
    // Initialise la liste des années pour le sélecteur
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1940; year--) {
      this.vehicleYears.push(year);
    }

    // Charge la liste des nationalités pour les listes déroulantes
    this.allCompagnies$ = this.dbService.getAllAssureurs();

    // Charge la liste des nationalités pour les listes déroulantes
    this.nationalities$ = this.dbService.getNationalities();

    // Logique d'auto-complétion pour la marque du véhicule
    this.filteredMarques$ = this.marqueCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        // Chaque fois que l'utilisateur tape dans le champ marque, on réinitialise le modèle.
        this.quoteUpdateForm.get('Véhicule.model')?.setValue('');
        this.modelesForSelectedMarque = [];
        this.selectedMarqueId = null;
      }),
      switchMap(value => {
        if (value && value.length >= 3) {
          this.isMarqueLoading = true;
          return this.dbService.searchMarques(value).pipe(
            finalize(() => this.isMarqueLoading = false)
          );
        }
        return of([]); // Retourne une liste vide si moins de 3 caractères
      })
    );

    this.quoteDetails$ = this.getQuoteDetailsFromRoute();
  }

  private patchFormValues(details: any): void {
    // Fonction utilitaire pour formater les dates
    const formatDate = (dateStr: string | null | undefined) => dateStr ? this.formatDateForInput(dateStr) : null;

    // Gérer le preneur (commun à beaucoup de devis)
    const preneurData = details.preneur || details;
    if (preneurData && this.quoteType !== 'obseques') { // NE PAS exécuter pour les obsèques
      this.quoteUpdateForm.get('Preneur d\'assurance')?.patchValue({
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

    // Gérer le conducteur principal (spécifique à 'auto')
    if (this.quoteType === 'auto') {
      this.showMainDriverSection = details.preneur_id !== details.conducteur_id;
      if (this.showMainDriverSection && details.conducteur) {
        this.quoteUpdateForm.get('Conducteur principal')?.patchValue({
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

      // Gérer le véhicule
      if (details.vehicule) {
        this.quoteUpdateForm.get('Véhicule')?.patchValue({
          make: details.vehicule.marque,
          model: details.vehicule.modele,
          year: details.vehicule.annee,
          licensePlate: details.vehicule.plaque
        });
        // Initialise le champ d'auto-complétion de la marque
        this.marqueCtrl.setValue(details.vehicule.marque || '', { emitEvent: false });
      }

      // Gérer les garanties auto
      this.quoteUpdateForm.get('Garantie')?.patchValue({
        baseRC: details.garantie_base_rc,
        omniumLevel: details.garantie_omnium_niveau,
        driverCoverage: details.garantie_conducteur,
        assistance: details.garantie_assistance,
        effectiveDate: formatDate(details.date_effet)
      });
    }

    // Gérer les détails spécifiques à 'habitation'
    // On vérifie la présence d'un champ spécifique à l'habitation pour être sûr
    if (this.quoteType === 'habitation' && details.hasOwnProperty('batiment_adresse')) {
      this.quoteUpdateForm.get('Bâtiment')?.patchValue({
        adresse: details.batiment_adresse,
        codePostal: details.batiment_code_postal,
        ville: details.batiment_ville,
        typeMaison: details.batiment_type_maison,
      });
      this.quoteUpdateForm.get('Évaluation')?.patchValue({
        typeValeurBatiment: details.evaluation_type_valeur_batiment,
        superficie: details.evaluation_superficie,
        nombrePieces: details.evaluation_nombre_pieces,
        loyerMensuel: details.evaluation_loyer_mensuel,
        typeValeurContenu: details.evaluation_type_valeur_contenu,
        valeurExpertise: details.evaluation_valeur_expertise,
        dateExpertise: formatDate(details.evaluation_date_expertise)
      });
      this.quoteUpdateForm.get('Garanties Habitation')?.patchValue({
        contenu: details.garantie_contenu,
        vol: details.garantie_vol,
        pertesIndirectes: details.garantie_pertes_indirectes,
        protectionJuridique: details.garantie_protection_juridique,
        assistance: details.garantie_assistance,
        dateEffet: formatDate(details.date_effet)
      });
    }

    // Gérer les détails spécifiques à 'obseques'
    if (this.quoteType === 'obseques' && details.hasOwnProperty('nombre_assures')) {
      // Remplir le formulaire simplifié du preneur pour les obsèques
      if (details.preneur) {
        this.quoteUpdateForm.get('Preneur Obsèques')?.patchValue({
          firstName: details.preneur.prenom,
          lastName: details.preneur.nom,
          dateNaissance: formatDate(details.preneur.date_naissance),
          email: details.preneur.email,
          phone: details.preneur.telephone,
          address: details.preneur.adresse,
          postalCode: details.preneur.code_postal,
          city: details.preneur.ville,
        });
      }
      this.quoteUpdateForm.get('Assurés.preneurEstAssure')?.setValue(details.preneur_est_assure);
      const assuresData = details.assures as any[];
      this.assures.clear();
      assuresData.forEach(assure => {
        assure.dateNaissance = formatDate(assure.dateNaissance);
        this.assures.push(this.createAssureFormGroup(assure));
      });
    }

    // Gérer les détails spécifiques à 'voyage'
    if (this.quoteType === 'voyage') {
      this.quoteUpdateForm.get('description')?.patchValue(details.description);
    }

    // Gérer les détails spécifiques à 'rc'
    if (this.quoteType === 'rc') {
      this.quoteUpdateForm.get('Détails RC Familiale')?.patchValue({
        preneur_nom: details.preneur_nom,
        preneur_prenom: details.preneur_prenom,
        preneur_genre: details.preneur_genre,
        preneur_telephone: details.preneur_telephone,
        preneur_email: details.preneur_email,
        preneur_adresse: details.preneur_adresse,
        preneur_code_postal: details.preneur_code_postal,
        preneur_ville: details.preneur_ville,
        risque: details.risque,
        nationalRegistryNumber: details.numero_national, // Assurez-vous que le nom de la propriété est correct
        idCardNumber: details.idcard_number, // Assurez-vous que le nom de la propriété est correct
        description: details.description
      });
    }
  }

  private getQuoteDetailsFromRoute(): Observable<any> {
    return this.route.paramMap.pipe(
      switchMap(params => {
        this.quoteType = params.get('type');
        this.quoteId = Number(params.get('id'));

        if (this.quoteType && this.quoteId) {
          return this.dbService.getQuoteDetails(this.quoteType, this.quoteId);
        }
        return of(null); // Retourne un observable de null si les paramètres sont manquants
      }),
      tap(details => {
        if (details) {
          this.patchFormValues(details);
        }
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des détails du devis:', error);
        return of(null); // Gère l'erreur et retourne un observable de null
      })
    );
  }

  // Getter pour un accès facile au FormArray des assurés
  get assures(): FormArray {
    return this.quoteUpdateForm.get('Assurés.assures') as FormArray;
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
    this.quoteUpdateForm.get('Véhicule.make')?.setValue(marque.nom);
    this.marqueCtrl.setValue(marque.nom, { emitEvent: false });

    // Réinitialise le champ modèle et charge la nouvelle liste
    this.quoteUpdateForm.get('Véhicule.model')?.setValue('');
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
    const originalFilesList = input.files;

    if (!originalFilesList || originalFilesList.length === 0) {
      return;
    }

    if (!this.quoteId || !this.quoteType) {
      console.error("L'ID ou le type de devis n'est pas disponible pour renommer les fichiers.");
      // On utilise les fichiers originaux si les infos manquent
      this.contractForm.patchValue({ fichiers_contrat: Array.from(originalFilesList) });
      return;
    }

    // Formate la date en YYYYMMDD
    const date = new Date();
    const formattedDate = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

    const renamedFiles: File[] = [];
    const baseName = `${this.quoteId}_${this.quoteType}_${formattedDate}`;

    for (let i = 0; i < originalFilesList.length; i++) {
      const originalFile = originalFilesList[i];
      const fileExtension = originalFile.name.split('.').pop();
      // Le nom final sera par ex: 9_auto_20251123_1.pdf
      const newName = `${baseName}_${i + 1}.${fileExtension}`;
      
      // On crée un nouveau fichier avec le même contenu mais un nouveau nom
      const renamedFile = new File([originalFile], newName, { type: originalFile.type });
      renamedFiles.push(renamedFile);
    }

    // On stocke les fichiers renommés dans le formulaire
    this.contractForm.patchValue({ fichiers_contrat: renamedFiles });
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
    const filesToUpload = contractValue.fichiers_contrat;

    // Crée un observable qui gère le téléversement. S'il n'y a pas de fichiers, il émet un tableau vide.
    const upload$ = (filesToUpload && filesToUpload.length > 0)
      ? this.uploaderService.uploadContractFiles(filesToUpload, this.quoteId!, this.quoteType)
      : of([]);

    upload$.pipe(
      switchMap(uploadedFilePaths => {
        // 'uploadedFilePaths' est le tableau des chemins des fichiers retourné par Supabase.
        console.log('Fichiers téléversés:', uploadedFilePaths);

        // Prépare les données à sauvegarder dans votre base de données.
        const contractPayload: ContractPayload = {
          quote_id: this.quoteId!,
          quote_type: this.quoteType!,
          compagnie_id: contractValue.compagnie_id!,
          date_contrat: contractValue.date_contrat!,
          periodicite: contractValue.periodicite!,
          rappel: contractValue.rappel!,
          document_paths: uploadedFilePaths, // Ajoute les chemins des documents
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

  updateQuoteDetails() {
    if (!this.quoteUpdateForm.valid) {
      console.error('Le formulaire de mise à jour est invalide.');
      // Optionnel: marquer tous les champs comme "touchés" pour afficher les erreurs
      this.quoteUpdateForm.markAllAsTouched();
      return;
    }

    const formValue = this.quoteUpdateForm.value;

    if (this.quoteType === 'auto') {
      const payload: AutoQuoteUpdatePayload = {
        preneur: formValue["Preneur d'assurance"]!,
        vehicule: formValue['Véhicule']!,
        devis: {
          garantie_base_rc: formValue.Garantie?.baseRC ?? false,
          garantie_omnium_niveau: formValue.Garantie?.omniumLevel ?? '',
          garantie_conducteur: formValue.Garantie?.driverCoverage ?? false,
          garantie_assistance: formValue.Garantie?.assistance ?? false,
          date_effet: formValue.Garantie?.effectiveDate ? this.formatDateForInput(formValue.Garantie.effectiveDate) : ''
        }
      };
      if (this.showMainDriverSection) {
        payload.conducteur = formValue['Conducteur principal']!;
      }
      this.executeUpdate(this.dbService.updateAutoQuote(this.quoteId!, payload));

    } else if (this.quoteType === 'obseques') {
      const assuresValue = this.assures.value.map((assure: any) => ({
        ...assure,
        dateNaissance: assure.dateNaissance ? this.formatDateForInput(assure.dateNaissance) : null
      }));

      const payload: ObsequesQuoteUpdatePayload = {
        preneur: formValue["Preneur Obsèques"]!,
        devis: {
          preneur_est_assure: formValue.Assurés?.preneurEstAssure ?? false,
          assures: assuresValue,
          nombre_assures: assuresValue.length
        }
      };
      this.executeUpdate(this.dbService.updateObsequesQuote(this.quoteId!, payload));

    } else {
      console.error(`Le type de devis '${this.quoteType}' n'est pas supporté pour la mise à jour.`);
    }
  }

  private executeUpdate(updateObservable: Observable<{ success: boolean, error?: any, data?: any }>): void {
    console.log('Envoi des données de mise à jour...');
    updateObservable.pipe(
        catchError(error => {
          console.error('Erreur lors de la mise à jour du devis:', error);
          // Idéalement, afficher une notification à l'utilisateur
          return of({ success: false, error });
        })
      ).subscribe(response => {
        if (response && response.success) {
          console.log('Devis mis à jour avec succès !', response);
          this.quoteUpdateForm.markAsPristine(); // Réinitialise l'état du formulaire pour désactiver le bouton
          // Idéalement, afficher une notification de succès à l'utilisateur
        } else {
          console.error("La mise à jour du devis a échoué.", response?.error);
        }
      });
  }

  /**
   * Validateur personnalisé pour le numéro national belge.
   * Vérifie le format et la somme de contrôle.
   */
  private belgianNationalNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null; // Ne pas valider si le champ est vide (laissé à 'required')
      }
  
      // 1. Vérification du format
      const regex = /^\d{2}\.\d{2}\.\d{2}-\d{3}\.\d{2}$/;
      if (!regex.test(value)) {
        return { invalidFormat: true };
      }
  
      // 2. Vérification de la somme de contrôle
      const digitsOnly = value.replace(/\D/g, ''); // Supprime tous les caractères non numériques
      const baseNumberStr = digitsOnly.substring(0, 9);
      const checkDigit = parseInt(digitsOnly.substring(9, 11), 10);
      const baseNumber = parseInt(baseNumberStr, 10);
      const baseNumberFor2000 = parseInt('2' + baseNumberStr, 10);
      const calculatedCheckDigit = 97 - (baseNumber % 97);
      const calculatedCheckDigitFor2000 = 97 - (baseNumberFor2000 % 97);
      if (checkDigit !== calculatedCheckDigit && checkDigit !== calculatedCheckDigitFor2000) {
        return { invalidChecksum: true };
      }
      return null; // Valide
    };
  }
}