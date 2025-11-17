import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DbConnectService } from '../../services/db-connect.service';
import { PhoneFormatDirective } from '../../directives/phone-format.directive';

@Component({
  selector: 'app-assurance-juridique',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PhoneFormatDirective],
  templateUrl: './assurance-juridique.component.html',
})
export class AssuranceJuridiqueComponent {
  infoForm: FormGroup;
  submissionStatus: { success: boolean; message: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.infoForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      gsm: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.infoForm.valid) {
      this.dbConnectService.saveInfoRequestForm(this.infoForm.value, 'juridique').subscribe({
        next: () => {
          this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée.' };
          this.infoForm.reset();
        },
        error: (err: any) => {
          this.submissionStatus = { success: false, message: 'Une erreur est survenue lors de l\'envoi de votre demande.' };
          console.error(err);
        }
      });
    }
  }

  scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}