import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DbConnectService, PostalCode } from '../../services/db-connect.service';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { of, Subject } from 'rxjs';

@Component({
  selector: 'app-form-habitation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
        superficie: ['', Validators.required],
        loyer: [''],
      }),
      evaluation: this.fb.group({
        valeurBatiment: ['expertise', Validators.required],
        valeurContenu: ['courtier', Validators.required],
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

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
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
    }
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
      console.log(this.habitationForm.value);
      // Logique de soumission du formulaire
      this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée.' };
    } else {
      console.error('Formulaire invalide');
      this.submissionStatus = { success: false, message: 'Veuillez corriger les erreurs dans le formulaire.' };
    }
  }
}