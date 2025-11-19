import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DbConnectService, PostalCode } from '../../services/db-connect.service';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PhoneFormatDirective } from '../../directives/phone-format.directive';

@Component({
  selector: 'app-obseques',
  standalone: true,
  providers: [DbConnectService],
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PhoneFormatDirective],
  templateUrl: './obseques.component.html',
})
export class ObsequesComponent implements OnInit, OnDestroy {
  obsequesForm: FormGroup;
  private destroy$ = new Subject<void>();
  submissionStatus: { success: boolean; message: string } | null = null;

  // Pour l'autocomplétion du code postal
  filteredPostalCodes: PostalCode[] = [];
  cities: string[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.obsequesForm = this.fb.group({
      preneur: this.fb.group({
        genre: ['Madame'],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: ['', [Validators.required, this.ageValidator(18)]],
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        adresse: ['', Validators.required],
        codePostal: ['', Validators.required],
        ville: ['', Validators.required], // Champ ville ajouté
      }),
      nombreAssures: [1],
      preneurEstAssure: [true],
      assures: this.fb.array([]),
    });
  }

  /**
   * Validateur personnalisé pour vérifier l'âge minimum.
   * @param minAge L'âge minimum requis.
   */
  ageValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Laissé à 'required'
      }
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge ? null : { 'minAge': { requiredAge: minAge, actualAge: age } };
    };
  }

  ngOnInit(): void {
    this.addAssure(); // Ajoute le premier assuré par défaut
    this.handleFormChanges();

    if (isPlatformBrowser(this.platformId)) {
      this.obsequesForm.get('preneur.codePostal')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.isLoading = true),
        switchMap(value => {
          if (value && value.length >= 2) {
            return this.dbConnectService.getPostalCodes(value);
          } else {
            this.filteredPostalCodes = [];
            return of([]);
          }
        }),
        tap(() => {
          if (this.filteredPostalCodes.length > 0) {
            this.cities = [];
            this.obsequesForm.get('preneur.ville')?.setValue('');
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe(villes => {
        this.isLoading = false;
        this.filteredPostalCodes = villes;
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get assures(): FormArray {
    return this.obsequesForm.get('assures') as FormArray;
  }

  addAssure(): void {
    const assureForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      capital: [5000, [Validators.required, Validators.max(15000)]],
    });
    this.assures.push(assureForm);
  }

  removeAssure(index: number): void {
    this.assures.removeAt(index);
  }

  handleFormChanges(): void {
    this.obsequesForm.get('nombreAssures')?.valueChanges.subscribe(count => {
      while (this.assures.length < count) {
        this.addAssure();
      }
      while (this.assures.length > count) {
        this.removeAssure(this.assures.length - 1);
      }
    });

    this.obsequesForm.get('preneurEstAssure')?.valueChanges.subscribe(isAssure => {
      this.updatePreneurSiAssure();
    });
  }

  updatePreneurSiAssure(): void {
    if (this.obsequesForm.get('preneurEstAssure')?.value && this.assures.length > 0) {
      const preneurData = this.obsequesForm.get('preneur')?.value;
      this.assures.at(0).patchValue(preneurData);
    }
  }

  selectPostalCode(selectedCity: PostalCode): void {
    this.obsequesForm.get('preneur.codePostal')?.setValue(selectedCity.postalCode, { emitEvent: false });
    this.obsequesForm.get('preneur.ville')?.setValue(selectedCity.city);
    this.cities = [selectedCity.city];
    this.obsequesForm.get('preneur.ville')?.updateValueAndValidity();
    this.filteredPostalCodes = [];
  }

  onSubmit(): void {
    if (this.obsequesForm.valid) {
      this.dbConnectService.createObsequesQuote(this.obsequesForm.value).subscribe({
        next: (response) => {
          console.log('Devis obsèques enregistré avec succès', response);
          this.submissionStatus = { success: true, message: 'Votre demande de devis a bien été enregistrée !' };
          // this.obsequesForm.reset(); // Optionnel
        },
        error: (err: any) => {
          console.error("Erreur lors de l'enregistrement du devis obsèques", err);
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