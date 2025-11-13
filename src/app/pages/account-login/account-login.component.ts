import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-login.component.html',
  styleUrl: './account-login.component.css'
})
export class AccountLoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authService.signIn({ email, password }).subscribe({
      next: (response) => {
        if (response.error) {
          this.errorMessage = 'Email ou mot de passe incorrect.';
          console.error(response.error);
        } else {
          console.log('Login successful!', response.data.user);
          console.log('Full Supabase AuthResponse:', response); // Affiche l'objet de réponse complet de Supabase
          console.log('Attempting to navigate to /mydata...'); // Confirme que cette ligne est atteinte
          this.router.navigate(['/mydata']); // Redirige vers la page mydata en cas de succès
        }
      },
      error: (err) => {
        this.errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';
        console.error(err);
      }
    });
  }
}
