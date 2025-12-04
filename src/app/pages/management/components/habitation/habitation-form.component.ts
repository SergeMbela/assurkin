import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DbConnectService, Assureur, Statut } from '../../../../services/db-connect.service';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, startWith, catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-habitation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './habitation-form.component.html',
})
export class HabitationFormComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup; // Sera initialisé dans ngOnInit
  @Input() isReadOnly: boolean = false;

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
    this.initializeForm();
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();

    if (isPlatformBrowser(this.platformId)) {
      const batimentPostalCodeControl = this.parentForm.get('batiment.codePostal');
      if (batimentPostalCodeControl) {
        this.batimentCities$ = batimentPostalCodeControl.valueChanges.pipe(
          startWith(batimentPostalCodeControl.value || ''),
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
        adresse: ['', Validators.required],
        codePostal: ['', Validators.required],
        ville: ['', Validators.required],
        batiment_type_maison: [''],
      }),
      evaluation: this.fb.group({
        evaluation_superficie: [null],
        evaluation_nombre_pieces: [null],
        evaluation_loyer_mensuel: [null],
        evaluation_type_valeur_batiment: [null],
        evaluation_valeur_expertise: [null],
        evaluation_date_expertise: [null],
        evaluation_type_valeur_contenu: [null],
        evaluation_valeur_libre_contenu: [null],
      }),
      garantiesHabitation: this.fb.group({
        garantie_contenu: [false],
        garantie_vol: [false],
        garantie_pertes_indirectes: [false],
        garantie_protection_juridique: [false],
        garantie_assistance: [false],
        date_effet: [null],
        compagnie_id: [null],
        statut: [null],
      }),
    });
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