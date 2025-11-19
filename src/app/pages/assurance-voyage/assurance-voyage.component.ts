import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DbConnectService } from '../../services/db-connect.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-assurance-voyage',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './assurance-voyage.component.html',
  styleUrl: './assurance-voyage.component.css'
})
export class AssuranceVoyageComponent {
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
      gsm: [''],
      message: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.infoForm.valid) {
      this.dbConnectService.saveVoyageForm(this.infoForm.value).subscribe({
        next: () => {
          this.submissionStatus = { success: true, message: 'Votre demande a bien été envoyée !' };
          this.infoForm.reset();
        },
        error: () => this.submissionStatus = { success: false, message: 'Une erreur est survenue. Veuillez réessayer.' }
      });
    }
  }

  scrollToSection(sectionId: string): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
