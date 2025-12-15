import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DbConnectService } from '../../services/db-connect.service';
import { MailService } from '../../services/mail.service';
import { EmailTemplateService } from '../../services/email-template.service';
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
  resetPasswordForm!: FormGroup;
  isResettingPassword = false;
  activeTab: 'login' | 'register' = 'login';

  // Propriétés pour la popup de notification
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  private popupTimeout: any;

  private fb = inject(FormBuilder);
  private dbConnectService = inject(DbConnectService);
  private authService = inject(AuthService);
  private mailService = inject(MailService);
  private emailTemplateService = inject(EmailTemplateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() { }

  ngOnInit(): void {
    // On échappe les points dans le nom de domaine pour le regex
    const domain = environment.domain_name.replace(/\./g, '\\.');
    const emailPattern = new RegExp(`^[A-Za-z0-9._%+-]+@${domain}$`, 'i');

    this.loginForm = this.fb.group({
      // Ajout du validateur de pattern pour le domaine
      email: ['', [Validators.required, Validators.email, Validators.pattern(emailPattern)]],
      password: ['', Validators.required]
    });

    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(emailPattern)]]
    });

    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      fonction: [''],
      // La contrainte de domaine est gérée par la DB, mais on peut l'ajouter ici aussi
      email: ['', [Validators.required, Validators.email, Validators.pattern(emailPattern)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', Validators.required]
    }, { validators: passwordsMatchValidator });

    // Vérifier s'il y a un message d'erreur dans l'URL (ex: retour du Guard après lien expiré)
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        // Petit délai pour s'assurer que l'interface est prête
        setTimeout(() => this.showNotification(params['error'], 'error'), 500);
      }
    });
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authService.signIn(this.loginForm.value).subscribe({
      next: (response) => {
        if (response.error) {
          // Gérer les erreurs d'authentification renvoyées par Supabase
          this.showNotification(response.error.message, 'error');
        } else {
          // Redirection vers la page de management en cas de succès
          this.router.navigate(['/management']);
        }
      },
      error: (err) => {
        this.showNotification(`Erreur d'authentification: ${err.message}`, 'error');
      }
    });
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
        // Envoi de l'email de bienvenue via SendGrid
        const loginUrl = `${window.location.origin}/corporate`;
        const htmlContent = this.emailTemplateService.getWelcomeEmail(accountData.prenom, accountData.nom, loginUrl);

        this.mailService.sendEmail({
          to: accountData.email,
          subject: 'Bienvenue sur Assurkin Corporate',
          htmlContent: htmlContent
        }).subscribe({
          error: (err) => console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', err)
        });

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

  onResetPasswordSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }
    const email = this.resetPasswordForm.value.email;
    this.authService.sendPasswordResetEmail(email).subscribe({
      next: ({ error }) => {
        if (error) {
          this.showNotification(`Erreur : ${error.message}`, 'error');
        } else {
          // Pour des raisons de sécurité, on affiche un message générique.
          this.showNotification('Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.', 'success');
          this.toggleResetPasswordView(false);
        }
      },
      error: (err) => {
        this.showNotification(`Une erreur est survenue : ${err.message}`, 'error');
      }
    });
  }

  toggleResetPasswordView(show: boolean): void {
    this.isResettingPassword = show;
  }

  setActiveTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
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
