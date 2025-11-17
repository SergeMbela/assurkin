import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DbConnectService } from '../../services/db-connect.service';
import { AuthService } from './auth.service';

// Custom validator to check if two fields match
function mustMatch(controlName: string, matchingControlName: string): (formGroup: AbstractControl) => ValidationErrors | null {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control = formGroup.get(controlName);
    const matchingControl = formGroup.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      // return if another validator has already found an error on the matchingControl
      return null;
    }

    // set error on matchingControl if validation fails
    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ mustMatch: true });
      return { mustMatch: true };
    } else {
      matchingControl.setErrors(null);
      return null;
    }
  };
}

@Component({
  selector: 'app-account-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  providers: [AuthService], // Ajout du service d'authentification
  templateUrl: './account-creation.component.html',
})
export class AccountCreationComponent implements OnInit {
  accountForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.accountForm = this.fb.group({
      gender: ['', Validators.required],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      mobileNumber: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, {
      validators: [
        mustMatch('email', 'confirmEmail'),
        mustMatch('password', 'confirmPassword')
      ]
    });

    if (isPlatformBrowser(this.platformId)) {
      const savedData = localStorage.getItem('autoFormData');
      if (savedData) {
        const autoFormData = JSON.parse(savedData);
        const preneurData = autoFormData.preneur;

        // Map 'Madame'/'Monsieur' to 'female'/'male'
        let gender = '';
        if (preneurData.genre === 'Madame') gender = 'female';
        if (preneurData.genre === 'Monsieur') gender = 'male';
        if (preneurData.genre === 'Autre') gender = 'other';

        this.accountForm.patchValue({
          gender: gender,
          lastName: preneurData.nom,
          firstName: preneurData.prenom,
          email: preneurData.email,
          confirmEmail: preneurData.email,
          mobileNumber: preneurData.telephone
        });
      }
    }
  }

  get f() { return this.accountForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Arrêter si le formulaire est invalide
    if (this.accountForm.invalid) {
      return;
    }

    const { email, password, firstName, lastName, gender } = this.accountForm.value;

    this.authService.signUp({ email, password }, { firstName, lastName, gender }).subscribe({
      next: (response) => {
        if (response.error) {
          // Gérer les erreurs retournées par Supabase (ex: email déjà utilisé)
          if (response.error.message && response.error.message.includes('User already registered')) {
            this.errorMessage = 'Un compte avec cette adresse email existe déjà. Veuillez vous connecter ou utiliser une autre adresse.';
          } else {
            this.errorMessage = response.error.message;
          }
          console.error('Erreur lors de la création du compte:', response.error);
        } else if (response.data.user) {
          // Vérifier si l'utilisateur a bien été créé ou s'il existait déjà
          if (response.data.user.identities && response.data.user.identities.length > 0) {
            // Succès : le compte a été créé
            this.successMessage = 'Votre compte a été créé avec succès ! Un email de confirmation vous a été envoyé.';
            console.log('Utilisateur créé:', response.data.user);
            this.accountForm.reset();
            this.submitted = false;
          } else {
            // L'utilisateur existe déjà, car `identities` est vide
            this.errorMessage = 'Un compte avec cette adresse email existe déjà. Veuillez vous connecter ou utiliser une autre adresse.';
          }
        }
      },
      error: (err) => {
        // Gérer les erreurs réseau ou autres erreurs inattendues
        this.errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.';
        console.error('Erreur de soumission:', err);
      }
    });
  }
}