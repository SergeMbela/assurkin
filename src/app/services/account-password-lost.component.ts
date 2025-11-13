import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-account-password-lost',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-password-lost.component.html',
})
export class AccountPasswordLostComponent {
  passwordLostForm: FormGroup;
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.passwordLostForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.passwordLostForm.invalid) {
      return;
    }

    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    try {
      const email = this.passwordLostForm.value.email;
      const { error } = await this.authService.sendPasswordResetEmail(email).toPromise();

      if (error) {
        this.errorMessage = "Une erreur est survenue. Veuillez vérifier l'adresse e-mail et réessayer.";
      } else {
        this.successMessage = 'Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.';
      }
    } finally {
      this.loading = false;
    }
  }
}