import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BELGIAN_POST_CODES, PostalCodeCity } from '../form-auto/belgian-post-codes';
import { DbConnectService } from '../../services/db-connect.service';

@Component({
  selector: 'app-form-rc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-rc.component.html',
})
export class FormRcComponent {
  rcForm: FormGroup;
  submissionStatus: { success: boolean; message: string } | null = null;
  minDate: string;
  cities: string[] = [];
  filteredPostalCodes: PostalCodeCity[] = [];

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService
  ) {
    this.minDate = new Date().toISOString().split('T')[0];

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

  onPostalCodeInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    if (input) {
      const postalCodes = BELGIAN_POST_CODES.filter(pc => pc.postalCode.startsWith(input));
      this.filteredPostalCodes = [...new Map(postalCodes.map(item => [item.postalCode, item])).values()].slice(0, 5);
    } else {
      this.filteredPostalCodes = [];
      this.cities = [];
      this.rcForm.get('preneur.ville')?.disable();
    }
  }

  selectPostalCode(postalCode: string): void {
    this.rcForm.get('preneur.codePostal')?.setValue(postalCode);
    this.cities = BELGIAN_POST_CODES.filter(pc => pc.postalCode === postalCode).map(pc => pc.city);
    this.rcForm.get('preneur.ville')?.enable();
    this.rcForm.get('preneur.ville')?.setValue(this.cities.length > 0 ? this.cities[0] : '');
    this.filteredPostalCodes = [];
  }

  onSubmit(): void {
    if (this.rcForm.valid) {
      this.dbConnectService.saveRcForm(this.rcForm.getRawValue()).subscribe({
        next: () => {
          this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée !' };
          this.rcForm.reset({ dateEffet: this.minDate, preneur: { genre: 'Madame' }, risque: 'famille' });
          this.cities = [];
        },
        error: () => this.submissionStatus = { success: false, message: 'Une erreur est survenue. Veuillez réessayer.' }
      });
    }
  }
}