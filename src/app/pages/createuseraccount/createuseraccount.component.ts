import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DbConnectService } from '../../services/db-connect.service';

@Component({
  selector: 'app-createuseraccount',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './createuseraccount.component.html',
})
export class CreateuseraccountComponent implements OnInit {
  accountForm: FormGroup;
  preneurData: any;
  submissionStatus: { success: boolean; message: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbConnectService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // Le code dépendant du navigateur est déplacé dans ngOnInit
    this.accountForm = this.fb.group({
      nom: [{ value: '', disabled: true }, Validators.required],
      prenom: [{ value: '', disabled: true }, Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      permis: [{ value: '', disabled: true }, Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    // On s'assure que ce code ne s'exécute que dans le navigateur
    if (isPlatformBrowser(this.platformId)) {
      const navigation = this.router.getCurrentNavigation();
      this.preneurData = navigation?.extras?.state?.['preneurData'];

      if (this.preneurData) {
        // On utilise patchValue pour pré-remplir le formulaire
        this.accountForm.patchValue({
          nom: this.preneurData.nom,
          prenom: this.preneurData.prenom,
          email: this.preneurData.email,
          permis: this.preneurData.permis,
        });
      } else {
        // Si aucune donnée n'est passée, on redirige l'utilisateur.
        // Cette redirection ne doit se faire que côté client.
        console.warn('Aucune donnée de preneur reçue. Redirection vers le formulaire auto.');
        this.router.navigate(['/particulier/auto']);
      }
    }
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.submissionStatus = { success: false, message: 'Veuillez choisir un mot de passe valide.' };
      return;
    }

    // On récupère les valeurs des champs désactivés en utilisant getRawValue()
    const formValue = this.accountForm.getRawValue();

    const userData = {
      nom: formValue.nom,
      prenom: formValue.prenom,
      email: formValue.email,
      permis: formValue.permis,
      password: formValue.password,
      // Ajoutez ici d'autres champs du preneur si nécessaire
      dateNaissance: this.preneurData.dateNaissance,
      telephone: this.preneurData.telephone,
      adresse: this.preneurData.adresse,
      codePostal: this.preneurData.codePostal,
      ville: this.preneurData.ville,
      genre: this.preneurData.genre,
      datePermis: this.preneurData.datePermis,
    };

    this.dbConnectService.createUser(userData).subscribe({
      next: (response) => {
        this.submissionStatus = { success: true, message: 'Votre compte a été créé avec succès ! Vous allez être redirigé.' };
        // Gérer la suite : connexion automatique, redirection vers le devis, etc.
        // this.router.navigate(['/chemin-vers-devis', response.devisId]);
      },
      error: (err) => {
        this.submissionStatus = { success: false, message: 'Une erreur est survenue lors de la création du compte.' };
        console.error(err);
      }
    });
  }
}