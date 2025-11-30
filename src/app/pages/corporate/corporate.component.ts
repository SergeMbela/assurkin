import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DbConnectService } from '../../services/db-connect.service';
import { environment } from '../../../environments/environment';

export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const passwordConfirm = control.get('passwordConfirm');

  if (password && passwordConfirm && password.value !== passwordConfirm.value) {
    return { passwordsMismatch: true };
  }

  return null;
}

@Component({
  selector: 'app-corporate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './corporate.component.html',
  styleUrl: './corporate.component.css'
})
export class CorporateComponent implements OnInit {
  registerForm!: FormGroup;
  loginForm!: FormGroup;

  // Propriétés pour la popup de notification
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  private popupTimeout: any;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // On échappe les points dans le nom de domaine pour le regex
    const domain = environment.domain_name.replace(/\./g, '\\.');
    const emailPattern = new RegExp(`^[A-Za-z0-9._%+-]+@${domain}$`, 'i');

    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      fonction: [''],
      // La contrainte de domaine est gérée par la DB, mais on peut l'ajouter ici aussi
      email: ['', [Validators.required, Validators.email, Validators.pattern(emailPattern)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', Validators.required]
    }, { validators: passwordsMatchValidator });
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      return; // Ne devrait pas arriver si le bouton est désactivé
    }
  }
  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
   
      return;
    }

    // On enlève passwordConfirm car il n'est pas utile pour la création du compte
    const { passwordConfirm, ...accountData } = this.registerForm.value;

    this.dbConnectService.createCorporateAccount(accountData).subscribe({
      next: () => {
        this.showNotification('Compte créé avec succès ! Veuillez consulter votre boîte mail pour valider votre compte.', 'success');
        this.registerForm.reset();
      },
      error: (err) => {
        let errorMessage = `Erreur lors de la création du compte: ${err.message}`;
        // On vérifie si l'erreur est due à un email déjà existant
        if (err.message && err.message.includes('duplicate key value violates unique constraint')) {
          errorMessage = 'Un compte avec cette adresse e-mail existe déjà.';
        }
        this.showNotification(errorMessage, 'error');
      }
    });
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
    
    this.popupTimeout = setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  public hideNotification(): void {
    this.showPopup = false;
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
  }
}
