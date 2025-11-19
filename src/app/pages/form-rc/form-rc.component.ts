import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, Injector } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { DbConnectService, PostalCode, RcFormData } from '../../services/db-connect.service';
import { PhoneNumberFormatDirective } from '../../directives/phone-number-format.directive';

@Component({
  selector: 'app-form-rc',
  standalone: true,
  providers: [DbConnectService],
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PhoneNumberFormatDirective],
  templateUrl: './form-rc.component.html',
})
export class FormRcComponent implements OnInit, OnDestroy {
  rcForm: FormGroup;
  minDate: string;
  submissionStatus: { success: boolean; message: string } | null = null;

  private destroy$ = new Subject<void>();
  private postalCode$ = new Subject<string>();
  filteredPostalCodes: PostalCode[] = [];
  cities: string[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private injector: Injector,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    this.rcForm = this.fb.group({
      preneur_nom: ['', Validators.required],
      preneur_prenom: ['', Validators.required],
      preneur_genre: ['Madame', Validators.required], // Validateur personnalisé pour le numéro de téléphone belge
      preneur_telephone: ['', [Validators.required, belgianPhoneNumberValidator()]],
      preneur_email: ['', [Validators.required, Validators.email]],
      preneur_adresse: ['', Validators.required],
      preneur_code_postal: ['', Validators.required],
      preneur_ville: [{ value: '', disabled: true }, Validators.required],
      risque: ['famille', Validators.required],
      date_effet: [this.minDate, Validators.required],
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const dbConnectService = this.injector.get(DbConnectService); // Injection via l'injecteur
      this.postalCode$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading = true;
          // On vide les suggestions à chaque nouvelle frappe pour éviter d'afficher d'anciennes données
          this.filteredPostalCodes = [];
        }),
        switchMap(value => {
          if (value && value.length >= 2) {
            return dbConnectService.getPostalCodes(value);
          } else {
            // Si la saisie est trop courte, on vide tout et on désactive le champ ville
            this.cities = [];
            this.rcForm.get('preneur_ville')?.setValue('');
            this.rcForm.get('preneur_ville')?.disable();
            return of([]);
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe(postalCodes => {
        this.isLoading = false;
        // On met à jour la liste des suggestions à afficher dans le template
        this.filteredPostalCodes = postalCodes;
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPostalCodeInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.postalCode$.next(input);
  }

  selectPostalCode(selectedCity: PostalCode): void {
    if (selectedCity && selectedCity.postalCode) {
      // Définit le code postal. N'émet pas d'événement pour éviter de déclencher valueChanges deux fois.
      this.rcForm.get('preneur_code_postal')?.setValue(selectedCity.postalCode, { emitEvent: false });
      // On vide la liste des suggestions pour la cacher
      this.filteredPostalCodes = [];

      const dbConnectService = this.injector.get(DbConnectService);
      dbConnectService.getCitiesByPostalCode(selectedCity.postalCode).pipe(
        takeUntil(this.destroy$)
      ).subscribe(cities => {
        this.cities = cities;
        if (cities.length > 0) {
          this.rcForm.get('preneur_ville')?.enable();
          // Définit la ville spécifique qui a été cliquée, si elle est dans la liste
          if (cities.includes(selectedCity.city)) {
            this.rcForm.get('preneur_ville')?.setValue(selectedCity.city);
          } else if (cities.length === 1) {
            this.rcForm.get('preneur_ville')?.setValue(cities[0]);
          } else {
            this.rcForm.get('preneur_ville')?.setValue(''); // Efface si plusieurs villes et la ville cliquée n'est pas trouvée
          }
        } else {
          this.rcForm.get('preneur_ville')?.setValue('');
          this.rcForm.get('preneur_ville')?.disable();
        }
      });
    }
  }

  onSubmit(): void {
    if (this.rcForm.valid) {
      // La structure du formulaire correspond maintenant directement à l'interface RcFormData.
      const formData: RcFormData = this.rcForm.getRawValue();

      this.injector.get(DbConnectService).saveRcForm(formData) // Injection via l'injecteur
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée.' };
            this.rcForm.reset();
          },
          error: (error) => {
            this.submissionStatus = { success: false, message: 'Une erreur est survenue. Veuillez réessayer.' };
            console.error('Erreur lors de la soumission du formulaire RC:', error);
          }
        });
    } else {
      this.markAllAsTouched(this.rcForm);
      this.submissionStatus = { success: false, message: 'Veuillez corriger les erreurs dans le formulaire.' };
    }
  }

  private markAllAsTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markAllAsTouched(control);
      }
    });
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

/**
 * Validateur personnalisé pour les numéros de téléphone belges.
 * Vérifie si le numéro contient 9 ou 10 chiffres.
 * @returns Une fonction de validation pour les formulaires réactifs.
 */
export function belgianPhoneNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Ne pas valider si le champ est vide (laissé à Validators.required)
    }
    const digits = value.replace(/\D/g, ''); // Supprime tous les caractères non numériques
    const isValid = digits.length === 9 || digits.length === 10;
    return isValid ? null : { invalidPhoneNumber: true };
  };
}