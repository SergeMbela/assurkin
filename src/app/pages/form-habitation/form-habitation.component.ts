import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BELGIAN_POST_CODES, PostalCodeCity } from '../form-auto/belgian-post-codes';
import { DbConnectService } from '../../services/db-connect.service';

@Component({
  selector: 'app-form-habitation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-habitation.component.html',
})
export class FormHabitationComponent {
  habitationForm: FormGroup;
  submissionStatus: { success: boolean; message: string } | null = null;
  minDate: string;

  cities: string[] = [];
  filteredPostalCodes: PostalCodeCity[] = [];

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService
  ) {
    this.minDate = new Date().toISOString().split('T')[0];

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
        ville: [{ value: '', disabled: true }, Validators.required],
        typeMaison: ['Maison 2 façades', Validators.required],
        superficie: ['', [Validators.required, Validators.min(1)]],
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

  onPostalCodeInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    if (input) {
      const postalCodes = BELGIAN_POST_CODES.filter(pc => pc.postalCode.startsWith(input));
      this.filteredPostalCodes = [...new Map(postalCodes.map(item => [item.postalCode, item])).values()].slice(0, 5);
    } else {
      this.filteredPostalCodes = [];
      this.cities = [];
      this.habitationForm.get('batiment.ville')?.disable();
    }
  }

  selectPostalCode(postalCode: string): void {
    this.habitationForm.get('batiment.codePostal')?.setValue(postalCode);
    this.cities = BELGIAN_POST_CODES
      .filter(pc => pc.postalCode === postalCode)
      .map(pc => pc.city);
    this.habitationForm.get('batiment.ville')?.enable();
    this.habitationForm.get('batiment.ville')?.setValue(this.cities.length > 0 ? this.cities[0] : '');
    this.filteredPostalCodes = [];
  }

  onSubmit(): void {
    if (this.habitationForm.valid) {
      this.dbConnectService.saveHabitationForm(this.habitationForm.getRawValue()).subscribe({
        next: () => {
          this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée !' };
          this.habitationForm.reset({
            dateEffet: this.minDate,
            preneur: { genre: 'Madame' },
            batiment: { typeMaison: 'Maison 2 façades' },
            evaluation: { valeurBatiment: 'expertise', valeurContenu: 'courtier' }
          });
          this.cities = [];
        },
        error: () => this.submissionStatus = { success: false, message: 'Une erreur est survenue. Veuillez réessayer.' }
      });
    }
  }
}