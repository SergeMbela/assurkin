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
  loading = false;

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
    this.loading = true;

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authService.signIn({ email, password }).subscribe({
      next: (response) => {
        if (response.error) {
          this.loading = false;
          this.errorMessage = 'Email ou mot de passe incorrect.';
          console.error(response.error);
        } else {
          this.router.navigate(['/mydata']); // Redirige vers la page mydata en cas de succès
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';
        console.error(err);
      }
    });
  }
}
