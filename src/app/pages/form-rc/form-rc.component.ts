import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { DbConnectService, PostalCode } from '../../services/db-connect.service';

@Component({
  selector: 'app-form-rc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-rc.component.html',
})
export class FormRcComponent implements OnInit, OnDestroy {
  rcForm: FormGroup;
  minDate: string;
  submissionStatus: { success: boolean; message: string } | null = null;

  private destroy$ = new Subject<void>();
  filteredPostalCodes: PostalCode[] = [];
  cities: string[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    this.rcForm = this.fb.group({
      preneur: this.fb.group({
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        genre: ['Madame', Validators.required],
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        adresse: ['', Validators.required],
        codePostal: ['', Validators.required],
        ville: [{ value: '', disabled: true }, Validators.required],
      }),
      risque: ['famille', Validators.required],
      dateEffet: [this.minDate, Validators.required],
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.rcForm.get('preneur.codePostal')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.isLoading = true),
        switchMap(value => {
          if (value && value.length >= 2) {
            return this.dbConnectService.getPostalCodes(value);
          } else {
            this.filteredPostalCodes = [];
            this.cities = [];
            this.rcForm.get('preneur.ville')?.setValue('');
            return of([]);
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe(postalCodes => {
        this.isLoading = false;
        this.filteredPostalCodes = postalCodes;
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
    if (selectedCity) {
      this.rcForm.get('preneur.codePostal')?.setValue(selectedCity.postalCode, { emitEvent: false });
      this.rcForm.get('preneur.ville')?.setValue(selectedCity.city);
      this.cities = [selectedCity.city];
      this.rcForm.get('preneur.ville')?.enable();
      this.rcForm.get('preneur.ville')?.updateValueAndValidity();
    }
    this.filteredPostalCodes = [];
  }

  onSubmit(): void {
    if (this.rcForm.valid) {
      console.log(this.rcForm.value);
      // Logique de soumission du formulaire
      this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée.' };
    } else {
      console.error('Formulaire invalide');
      this.submissionStatus = { success: false, message: 'Veuillez corriger les erreurs dans le formulaire.' };
    }
  }
}