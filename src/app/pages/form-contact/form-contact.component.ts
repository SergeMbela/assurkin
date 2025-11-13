import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DbConnectService } from '../../services/db-connect.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-contact',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './form-contact.component.html',
  styleUrl: './form-contact.component.css'
})
export class FormContactComponent {
  contactForm: FormGroup;
  submissionStatus: { success: boolean; message: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService
  ) {
    this.contactForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      gsm: [''],
      message: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.dbConnectService.saveContactForm(this.contactForm.value).subscribe({
        next: () => {
          this.submissionStatus = { success: true, message: 'Votre message a bien été envoyé !' };
          this.contactForm.reset();
        },
        error: (err) => {
          console.error('An error occurred during form submission:', err);
          this.submissionStatus = { success: false, message: 'Une erreur est survenue. Veuillez réessayer.' };
        }
      });
    }
  }
}
