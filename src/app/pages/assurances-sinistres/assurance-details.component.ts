import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbConnectService, Contrat } from '../../services/db-connect.service';
import { UploaderService } from '../../services/uploader.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-assurance-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assurance-details.component.html',
})
export class AssuranceDetailsComponent implements OnInit {
  // Injection de dépendances moderne avec inject()
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dbConnectService = inject(DbConnectService);
  private uploaderService = inject(UploaderService);
  private fb = inject(FormBuilder);

  contract: Contrat | null = null;
  loading = true;
  uploading = false;
  uploadProgress = 0;
  
  communicationForm: FormGroup;
  selectedFile: File | null = null;

  constructor() {
    this.communicationForm = this.fb.group({
      message: ['', Validators.required],
      file: [null] // Ce contrôle n'est pas directement lié, mais utile pour la validation
    });
  }

  ngOnInit(): void {
    const contractId = this.route.snapshot.paramMap.get('id');
    // Récupérer le type de contrat passé depuis la page précédente
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const contractType = navigationState ? navigationState['type'] : null;

    if (contractId && contractType) {
      // Correction : Utiliser getContractById pour récupérer un seul contrat.
      // getContracts retourne un tableau, ce qui causait l'erreur de type.
      this.dbConnectService.getContractById(+contractId, contractType).subscribe({
        next: (data) => {
          // data est maintenant un seul objet Contrat, ce qui correspond au type de this.contract.
          this.contract = data; 
          this.loading = false;
        },
        error: (err) => {
          console.error("Erreur lors de la récupération du contrat", err);
          this.loading = false;
        }
      });
    } else {
      console.error("ID de contrat ou type manquant pour l'affichage des détails.");
      this.loading = false;
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.communicationForm.patchValue({ file: this.selectedFile });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.communicationForm.invalid || !this.contract) {
      this.communicationForm.markAllAsTouched(); // Affiche les erreurs de validation
      return;
    }

    this.uploading = true;
    const message = this.communicationForm.get('message')?.value;
    const contractType = this.contract.categorie;

    try {
      if (this.selectedFile) {
        // Cas avec un fichier à uploader
        const upload$ = this.uploaderService.uploadContractFiles(this.selectedFile, contractType, message, this.contract.id);

        upload$.pipe(
          finalize(() => {
            this.uploading = false;
            alert('Votre message et votre document ont été envoyés avec succès !');
            this.router.navigate(['/my-data']);
          })
        ).subscribe((progress: number | null) => {
          this.uploadProgress = progress ?? 0;
        });
      } else {
        // Cas sans fichier: sauvegarder uniquement le message
        await this.uploaderService.saveMessage(contractType, message, this.contract.id); // Assumes contract.id is the correct foreign key
        this.uploading = false;
        alert('Votre message a été envoyé avec succès !');
        this.router.navigate(['/my-data']);
      }
    } catch (error) {
      this.uploading = false;
      console.error("Erreur lors de l'envoi de la communication", error);
      alert("Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
    }
  }
}