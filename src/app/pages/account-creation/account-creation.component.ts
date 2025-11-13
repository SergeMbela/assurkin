import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../account-creation/auth.service';

/**
 * Validateur personnalisé pour vérifier que deux champs correspondent.
 * @param controlName Le nom du contrôle principal.
 * @param matchingControlName Le nom du contrôle à comparer.
 */
export function MustMatch(controlName: string, matchingControlName: string) {
  return (formGroup: FormGroup): ValidationErrors | null => {
    const control = formGroup.controls[controlName];
    const matchingControl = formGroup.controls[matchingControlName];

    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      // Retourne si un autre validateur a déjà trouvé une erreur sur le matchingControl
      return null;
    }

    // Définit l'erreur sur matchingControl si la validation échoue
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
  imports: [CommonModule, ReactiveFormsModule],
  providers: [AuthService],
  templateUrl: './account-creation.component.html',
  styleUrls: ['./account-creation.component.css'],
})
export class AccountCreationComponent implements OnInit {
  accountForm!: FormGroup;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) { }

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
        MustMatch('email', 'confirmEmail'),
        MustMatch('password', 'confirmPassword')
      ]
    });
  }

  // Accès facile aux contrôles du formulaire pour le template
  get f() { return this.accountForm.controls; }

  onSubmit(): void {
    // Guard against running on the server
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.submitted = true;
    this.successMessage = null;
    this.errorMessage = null;

    if (this.accountForm.invalid) {
      console.log('Formulaire invalide');
      return;
    }

    const { email, password, firstName, lastName, gender } = this.accountForm.value;

    this.authService.signUp({ email, password }, { firstName, lastName, gender })
      .subscribe({
        next: (response) => {
          if (response.error) {
            this.errorMessage = `Erreur lors de la création du compte: ${response.error.message}`;
            console.error(this.errorMessage);
          } else {
            this.successMessage = 'Votre compte a été créé avec succès ! Veuillez vérifier votre e-mail pour activer votre compte.';
            console.log('Compte créé avec succès !', response.data.user);
          }
        },
        error: (err) => {
          this.errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';
          console.error(this.errorMessage, err);
        }
      });
  }
}