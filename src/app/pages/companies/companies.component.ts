import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DbConnectService } from '../../services/db-connect.service';

// Fonction de validation personnalisée pour vérifier qu'au moins une case est cochée
function atLeastOneCheckboxCheckedValidator(checkboxNames: string[]): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const isAtLeastOneChecked = checkboxNames.some(name => formGroup.get(name)?.value);
    return isAtLeastOneChecked ? null : { requireAtLeastOne: true };
  };
}

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css'
})
export class CompaniesComponent {
  private fb = inject(FormBuilder);
  private dbService = inject(DbConnectService);
  private platformId = inject(PLATFORM_ID);

  companyForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    legal_form: ['', Validators.required],
    enterprise_number: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    vat_number: ['', [Validators.pattern(/^BE/)]],
    street: ['', Validators.required],
    house_number: ['', Validators.required],
    postal_code: ['', Validators.required],
    city: ['', Validators.required],
    email: ['', [Validators.email]],
    has_car_policy: [false],
    wants_auto_insurance: [false],
    wants_home_insurance: [false],
    wants_liability_insurance: [false]
  }, { 
    validators: atLeastOneCheckboxCheckedValidator([
      'has_car_policy', 
      'wants_auto_insurance', 
      'wants_home_insurance', 
      'wants_liability_insurance'
    ]) 
  });

  legalForms: string[] = ['SRL', 'SA', 'SC', 'SNC', 'SComm', 'ASBL', 'Indépendant'];
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  onSubmit() {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = null;
    this.errorMessage = null;

    const formValue = this.companyForm.value;

    // Mapping des données pour correspondre aux paramètres de la fonction SQL
    const payload = {
      p_name: formValue.name,
      p_legal_form: formValue.legal_form,
      p_enterprise_number: formValue.enterprise_number,
      p_vat_number: formValue.vat_number || null, // La fonction SQL gère le NULL pour auto-générer
      p_street: formValue.street,
      p_house_number: formValue.house_number,
      p_postal_code: formValue.postal_code,
      p_city: formValue.city,
      p_email: formValue.email || null,
      p_has_car_policy: formValue.has_car_policy,
      p_wants_auto_insurance: formValue.wants_auto_insurance,
      p_wants_home_insurance: formValue.wants_home_insurance,
      p_wants_liability_insurance: formValue.wants_liability_insurance
    };

    console.log('Données prêtes pour register_belgian_company:', payload);

    this.dbService.registerCompany(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = 'Votre demande d\'informations nous est parvenues';
        this.companyForm.reset();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Erreur lors de l\'enregistrement:', err);
        this.errorMessage = err.message || 'Une erreur technique est survenue.';
      }
    });
  }

  scrollToForm() {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById('company-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
