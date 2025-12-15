import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DbConnectService, Assureur, Statut } from '../../../../services/db-connect.service';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, startWith, catchError, takeUntil, map } from 'rxjs/operators';

@Component({
  selector: 'app-habitation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './habitation-form.component.html',
})
export class HabitationFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() parentForm!: FormGroup; // Sera initialisé dans ngOnInit
  @Input() isReadOnly: boolean = false;
  @Input() initialData: any;

  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  batimentCities$: Observable<string[]>;
  preneurCities$!: Observable<string[]>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.batimentCities$ = of([]); // Initialisation
  }

  ngOnInit(): void {
    // Si aucun formulaire n'est passé en @Input, on en crée un avec la structure complète.
    // C'est la correction clé pour s'assurer que tous les groupes (batiment, evaluation, etc.) existent.
    if (!this.parentForm) { 
      this.initializeForm();
    } else {
      // Si le formulaire parent est fourni mais incomplet, on ajoute le contrôle manquant pour éviter l'erreur
      const evaluationGroup = this.parentForm.get('evaluation') as FormGroup;
      if (evaluationGroup && !evaluationGroup.contains('valeurLibreContenu')) {
        evaluationGroup.addControl('valeurLibreContenu', this.fb.control(null));
      }

      const garantiesGroup = this.parentForm.get('garantiesHabitation') as FormGroup;
      if (garantiesGroup && !garantiesGroup.contains('compagnie_id')) {
        garantiesGroup.addControl('compagnie_id', this.fb.control(null));
      }
    }

    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();

    if (isPlatformBrowser(this.platformId)) {
      const batimentPostalCodeControl = this.parentForm.get('batiment.batiment_code_postal');
      if (batimentPostalCodeControl) {
        // Réinitialise la ville lorsque le code postal change
        batimentPostalCodeControl.valueChanges.pipe(
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        ).subscribe(() => {
          // On ne réinitialise que si c'est une modification de l'utilisateur
          this.parentForm.get('batiment.batiment_ville')?.setValue(null, { emitEvent: false });
        });

        this.batimentCities$ = batimentPostalCodeControl.valueChanges.pipe(
          startWith(batimentPostalCodeControl.value || ''),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(pc => {
            if (pc && pc.length >= 4) {
              return this.dbService.getCitiesByPostalCode(pc).pipe(
                catchError(() => of([])), // En cas d'erreur, retourne un tableau vide,
              );
            }
            return of([]);
          }),
          // Assure que la ville initiale est toujours dans la liste
          map((cities: string[]) => {
            const currentCity = this.parentForm.get('batiment.batiment_ville')?.value;
            if (currentCity && !cities.includes(currentCity)) {
              return [currentCity, ...cities];
            }
            return cities;
          }),
          takeUntil(this.destroy$),
        );
      }

      // Logique pour les villes du preneur d'assurance
      const preneurPostalCodeControl = this.parentForm.get('preneurAssurance.code_postal');
      if (preneurPostalCodeControl) {
        this.preneurCities$ = preneurPostalCodeControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(pc => {
            if (pc && pc.length >= 4) {
              return this.dbService.getCitiesByPostalCode(pc).pipe(
                catchError(() => of([])), // En cas d'erreur, retourne un tableau vide
                takeUntil(this.destroy$)
              );
            }
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.initialData) {
      this.patchFormWithData(this.initialData);
    }
  }

  private initializeForm(): void {
    // Crée le formulaire avec tous les groupes et contrôles nécessaires
    this.parentForm = this.fb.group({
      preneurAssurance: this.fb.group({
        prenom: [{ value: '', disabled: true }],
        nom: [{ value: '', disabled: true }],
        date_naissance: [{ value: '', disabled: true }],
        email: [{ value: '', disabled: true }],
        telephone: [{ value: '', disabled: true }],
        nationalRegistryNumber: [{ value: '', disabled: true }],
        idCardNumber: [{ value: '', disabled: true }],
        idCardValidityDate: [{ value: '', disabled: true }],
        adresse: [{ value: '', disabled: true }],
        code_postal: [{ value: '', disabled: true }],
        ville: [{ value: '', disabled: true }],
      }),
      batiment: this.fb.group({
        batiment_adresse: ['', Validators.required],
        batiment_code_postal: ['', Validators.required],
        batiment_ville: ['', Validators.required],
        batiment_type_maison: [''], // Correspond à la vue de détail
      }),
      evaluation: this.fb.group({
        superficie: [null], // Correspond à la vue de détail
        nombrePieces: [null], // CamelCase pour correspondre à la vue de détail
        loyerMensuel: [null], // CamelCase pour correspondre à la vue de détail
        typeValeurBatiment: [null], // CamelCase pour correspondre à la vue de détail
        valeurExpertise: [null], // CamelCase pour correspondre à la vue de détail
        dateExpertise: [null], // CamelCase pour correspondre à la vue de détail
        typeValeurContenu: [null], // CamelCase pour correspondre à la vue de détail
        valeurLibreContenu: [null], // CamelCase pour correspondre à la vue de détail
      }),
      garantiesHabitation: this.fb.group({
        contenu: [false], // CamelCase pour correspondre à la vue de détail
        vol: [false], // CamelCase pour correspondre à la vue de détail
        pertesIndirectes: [false], // CamelCase pour correspondre à la vue de détail
        protectionJuridique: [false], // CamelCase pour correspondre à la vue de détail
        assistance: [false], // CamelCase pour correspondre à la vue de détail
        dateEffet: [null], // CamelCase pour correspondre à la vue de détail
        compagnie_id: [null],
        statut: [null],
      }),
    });
  }

  private patchFormWithData(data: any): void {
    if (!data || !this.parentForm) {
      return;
    }

    // Transformation de l'objet de la BDD pour correspondre à la structure du formulaire
    const formData = {
      preneurAssurance: {
        prenom: data.preneur?.prenom,
        nom: data.preneur?.nom,
        date_naissance: data.preneur?.date_naissance,
        email: data.preneur?.email,
        telephone: data.preneur?.telephone,
        nationalRegistryNumber: data.preneur?.numero_national,
        idCardNumber: data.preneur?.idcard_number,
        idCardValidityDate: data.preneur?.idcard_validity,
        adresse: data.preneur?.adresse,
        code_postal: data.preneur?.code_postal,
        ville: data.preneur?.ville,
      },
      batiment: {
        batiment_adresse: data.batiment_adresse,
        batiment_code_postal: data.batiment_code_postal,
        batiment_ville: data.batiment_ville,
        batiment_type_maison: data.batiment_type_maison,
      },
      evaluation: {
        superficie: data.evaluation_superficie,
        nombrePieces: data.evaluation_nombre_pieces,
        loyerMensuel: data.evaluation_loyer_mensuel,
        typeValeurBatiment: data.evaluation_type_valeur_batiment,
        valeurExpertise: data.evaluation_valeur_expertise,
        dateExpertise: data.evaluation_date_expertise,
        typeValeurContenu: data.evaluation_type_valeur_contenu,
        valeurLibreContenu: data.evaluation_valeur_libre_contenu,
      },
      garantiesHabitation: {
        contenu: data.garantie_contenu,
        vol: data.garantie_vol,
        pertesIndirectes: data.garantie_pertes_indirectes,
        protectionJuridique: data.garantie_protection_juridique,
        assistance: data.garantie_assistance,
        dateEffet: data.date_effet,
        compagnie_id: data.compagnie_id,
        statut: data.statut,
      },
    };

    this.parentForm.patchValue(formData);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}