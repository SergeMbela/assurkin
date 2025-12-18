import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './update-password.component.html',
})
export class UpdatePasswordComponent {
  updatePasswordForm: FormGroup;
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.updatePasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  async onSubmit(): Promise<void> {
    if (this.updatePasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    try {
      const password = this.updatePasswordForm.value.password;
      const response = await lastValueFrom(this.authService.updatePassword(password));

      if (response.error) {
        this.errorMessage = "Une erreur est survenue lors de la mise à jour du mot de passe. Veuillez réessayer.";
        console.error(response.error);
      } else {
        this.successMessage = "Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion.";
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }
    } catch (error) {
      this.errorMessage = "Une erreur inattendue est survenue.";
      console.error(error);
    } finally {
      this.loading = false;
    }
  }
}