import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DbConnectService, PostalCode } from '../../services/db-connect.service';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, map, catchError } from 'rxjs/operators';
import { of, Subject, Observable } from 'rxjs';
import { PhoneFormatDirective } from '../../directives/phone-format.directive';

@Component({
  selector: 'app-form-habitation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PhoneFormatDirective],
  templateUrl: './form-habitation.component.html',
})
export class FormHabitationComponent implements OnInit, OnDestroy {
  habitationForm: FormGroup;
  minDate: string;
  submissionStatus: { success: boolean; message: string } | null = null;

  private destroy$ = new Subject<void>();
  filteredPostalCodes: PostalCode[] = [];
  cities: string[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder, private dbConnectService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    this.habitationForm = this.fb.group({
      preneur: this.fb.group({
        genre: ['Madame', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: ['', Validators.required],
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
      }),
      batiment: this.fb.group({
        adresse: ['', Validators.required],
        codePostal: ['', Validators.required],
        ville: ['', Validators.required],
        typeMaison: ['Maison 2 façades', Validators.required],
      }),
      evaluation: this.fb.group({
        valeurBatiment: ['expertise', Validators.required],
        superficie: ['', Validators.required],
        nombrePieces: ['', [Validators.required, Validators.min(3)]],
        loyer: [''],
        valeurContenu: ['courtier', Validators.required],
        valeurExpertise: [null], // Valeur en euros
        dateExpertise: [null],   // Date de l'expertise (mois/année)
        valeurLibre: [null],     // Valeur librement exprimée
      }),
      garanties: this.fb.group({
        contenu: [false],
        vol: [false],
        pertesIndirectes: [false],
        protectionJuridique: [false],
        assistance: [false],
      }),
      dateEffet: [this.minDate, Validators.required],
    });
  }

  /**
   * Getter pour vérifier de manière sécurisée si l'email existe, pour le template.
   */
  get emailExists(): boolean {
    return (this.habitationForm.get('preneur.email') as any)?.emailExists === true;
  }

  /**
   * Logique pour vérifier si un email existe déjà et mettre à jour le contrôle, sans le rendre invalide.
   */
  private checkEmailExistence(control: AbstractControl): Observable<null> {
    // On attache une propriété personnalisée au lieu de retourner une erreur de validation.
    // Cela permet d'afficher le message sans invalider le formulaire.
    (control as any).emailExists = false;

    if (!control.value) {
      return of(null);
    }

    return this.dbConnectService.checkEmailExists(control.value).pipe(
      tap(exists => {
        if (exists) {
          (control as any).emailExists = true;
        }
      }),
      map(() => null), // On retourne toujours null pour que le contrôle reste valide.
      catchError(() => {
        (control as any).emailExists = false;
        return of(null);
      })
    );
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupEvaluationValidators();
      this.habitationForm.get('batiment.codePostal')?.valueChanges.pipe(
        debounceTime(300), // Attend 300ms après la dernière frappe
        distinctUntilChanged(), // N'émet que si la valeur a changé
        tap(() => this.isLoading = true),
        switchMap(value => {
          if (value && value.length >= 2) {
            return this.dbConnectService.getPostalCodes(value);
          } else {
            this.filteredPostalCodes = [];
            return of([]); // Retourne un observable vide
          }
        }),
        tap(() => {
          // Réinitialise la ville si la liste d'autocomplétion est affichée
          if (this.filteredPostalCodes.length > 0) {
            this.cities = [];
            this.habitationForm.get('batiment.ville')?.setValue('');
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe(villes => {
        this.isLoading = false;
        this.filteredPostalCodes = villes;
      });

      // Ajout de la vérification asynchrone pour l'email
      const emailControl = this.habitationForm.get('preneur.email');
      if (emailControl) {
        emailControl.valueChanges.pipe(
          debounceTime(500),
          distinctUntilChanged(),
          switchMap(() => this.checkEmailExistence(emailControl)),
          takeUntil(this.destroy$)
        ).subscribe();
      }
    }
  }

  private setupEvaluationValidators(): void {
    const evaluationGroup = this.habitationForm.get('evaluation') as FormGroup;
    const valeurBatimentControl = evaluationGroup.get('valeurBatiment');
    const valeurExpertiseControl = evaluationGroup.get('valeurExpertise');
    const dateExpertiseControl = evaluationGroup.get('dateExpertise');
    const valeurLibreControl = evaluationGroup.get('valeurLibre');

    valeurBatimentControl?.valueChanges.pipe(
      takeUntil(this.destroy$) // Annule la souscription à la destruction du composant
    ).subscribe(value => {
        if (value === 'expertise') {
          valeurExpertiseControl?.setValidators([Validators.required, Validators.min(1)]);
          dateExpertiseControl?.setValidators(Validators.required);
          valeurLibreControl?.clearValidators();
          valeurLibreControl?.setValue(null);
        } else if (value === 'libre') {
          valeurLibreControl?.setValidators([Validators.required, Validators.min(1)]);
          valeurExpertiseControl?.clearValidators();
          dateExpertiseControl?.clearValidators();
          valeurExpertiseControl?.setValue(null);
          dateExpertiseControl?.setValue(null);
        } else {
          valeurExpertiseControl?.clearValidators();
          dateExpertiseControl?.clearValidators();
          valeurLibreControl?.clearValidators();
        }
        valeurExpertiseControl?.updateValueAndValidity();
        dateExpertiseControl?.updateValueAndValidity();
        valeurLibreControl?.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.destroy$.next();
      this.destroy$.complete();
    }
  }

  selectPostalCode(selectedCity: PostalCode): void {
    const selected = this.filteredPostalCodes.find(pc => pc.postalCode === selectedCity.postalCode && pc.city === selectedCity.city);

    if (selected) {
      this.habitationForm.get('batiment.codePostal')?.setValue(selected.postalCode, { emitEvent: false });
      this.habitationForm.get('batiment.ville')?.setValue(selected.city);
      this.cities = [selected.city];
      // On s'assure que le champ ville est bien sélectionné
      this.habitationForm.get('batiment.ville')?.updateValueAndValidity();
    }
    this.filteredPostalCodes = [];
  }

  onSubmit(): void {
    if (this.habitationForm.valid) {
      this.dbConnectService.createHabitationQuote(this.habitationForm.value).subscribe({
        next: (response) => {
          console.log('Devis habitation enregistré avec succès', response);
          this.submissionStatus = { success: true, message: 'Votre demande de devis a bien été enregistrée !' };
          // Optionnel : réinitialiser le formulaire après succès
          // this.habitationForm.reset(); 
        },
        error: (err: any) => {
          console.error("Erreur lors de l'enregistrement du devis habitation", err);
          this.submissionStatus = { success: false, message: "Une erreur est survenue lors de l'enregistrement de votre devis." };
        }
      });
    } else {
      console.error('Formulaire invalide');
      this.submissionStatus = { success: false, message: 'Veuillez remplir tous les champs obligatoires avant de soumettre.' };
    }
  }
  scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
