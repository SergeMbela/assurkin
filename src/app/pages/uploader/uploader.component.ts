import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, forkJoin } from 'rxjs';
import { UploaderService, UploadResult } from '../../services/uploader.service';
import { ContractService, ExistingFile } from '../../services/contract.service';
import { DbConnectService, SubjectContract } from '../../services/db-connect.service';

// Interface pour suivre l'état de chaque fichier
interface UploadState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  raison: string; // Raison du téléversement
  error?: string;
  filePath?: string; // Pour stocker le chemin du fichier après upload
}


@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uploaderService = inject(UploaderService);
  private contractService = inject(ContractService);
  private dbConnectService = inject(DbConnectService);

  quoteId!: number;
  quoteType!: string;

  uploadStates: UploadState[] = [];
  isUploading = false;
  uploadSuccess = false;
  errorMessage: string | null = null;

  raisons: SubjectContract[] = [];

  // Propriétés pour afficher les fichiers existants
  existingFiles$: Observable<ExistingFile[]> = of([]);

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.quoteId = Number(params.get('id'));
    this.quoteType = params.get('type') || '';

    if (!this.quoteId || !this.quoteType) {
      this.errorMessage = "Les informations du devis sont manquantes. Impossible de téléverser des fichiers.";
      console.error('Quote ID or Type is missing from route parameters.');
    } else {
      // Récupérer les fichiers existants pour ce devis
      this.existingFiles$ = this.contractService.getContractFiles(this.quoteId, this.quoteType);
      // Récupérer les raisons depuis le service
      this.dbConnectService.getContractSubjects().subscribe(raisons => {
        this.raisons = raisons;
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      // Initialiser l'état pour chaque nouveau fichier sélectionné
      this.uploadStates = Array.from(input.files).map(file => ({
        file: file,
        status: 'pending',
        raison: '' // La raison sera choisie via le select dans le template
      }));
      this.uploadSuccess = false;
      this.errorMessage = null;
    }
  }

  onUpload(): void {
    const filesToUpload = this.uploadStates.filter(s => s.status === 'pending');
    if (filesToUpload.length === 0 || !this.quoteId || !this.quoteType) {
      this.errorMessage = "Veuillez sélectionner au moins un fichier.";
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;

    // Marquer les fichiers comme "en cours de téléversement"
    this.uploadStates.forEach(state => {
      if (state.status === 'pending') state.status = 'uploading';
    });

    this.uploaderService.uploadContractFiles(filesToUpload.map(s => s.file), this.quoteId, this.quoteType)
      .subscribe({
        next: (result: UploadResult) => {
          // Mettre à jour le statut du fichier correspondant
          const state = this.uploadStates.find(s => s.file.name === result.fileName);
          if (state) {
            state.status = result.status;
            if (result.status === 'success') {
              state.filePath = result.path; // Stocker le chemin du fichier
            } else {
              state.error = result.error;
            }
          }
        },
        complete: () => {
          this.isUploading = false;
          // Sauvegarder les fichiers réussis en BDD et rafraîchir la liste
          this.saveFilesToDbAndRefresh();

          // Mettre à jour le statut global du téléversement
          const allSucceeded = this.uploadStates.every(s => s.status === 'success');
          this.uploadSuccess = allSucceeded;
        }
      });
  }

  goBack(): void {
    // Redirige vers la page de gestion appropriée en fonction du type de devis
    const managementPage = this.getManagementPageForType(this.quoteType);
    this.router.navigate([managementPage]);
  }

  private getManagementPageForType(type: string): string {
    switch (type) {
      case 'auto':
        return '/intranet/dashboard/auto-management';
      // Ajoutez d'autres cas pour d'autres types de devis si nécessaire
      // case 'habitation':
      //   return '/intranet/dashboard/habitation-management';
      default:
        return '/intranet/dashboard'; // Page par défaut
    }
  }

  getDownloadUrl(filePath: string): string {
    return this.uploaderService.getDownloadUrl(filePath);
  }

  private saveFilesToDbAndRefresh(): void {
    const successfulUploads = this.uploadStates
      .filter(s => s.status === 'success' && s.filePath)
      .map(s => this.contractService.addContractFile(this.quoteId, this.quoteType, s.filePath!, s.file.name, s.raison));

    if (successfulUploads.length > 0) {
      forkJoin(successfulUploads).subscribe({
        next: () => {
          console.log('Tous les fichiers ont été enregistrés en base de données avec succès.');
          // Une fois tous les fichiers enregistrés, rafraîchir la liste des fichiers existants
          this.existingFiles$ = this.contractService.getContractFiles(this.quoteId, this.quoteType);
          // Optionnel: réinitialiser les états pour permettre de nouveaux uploads
          // this.uploadStates = [];
        },
        error: (err) => {
          console.error("Une erreur est survenue lors de l'enregistrement d'un ou plusieurs fichiers en base de données:", err);
          this.errorMessage = "Erreur lors de la sauvegarde des références de fichiers. Veuillez réessayer.";
          this.isUploading = false; // S'assurer que l'état de chargement est réinitialisé
        }
      });
    }
  }

  hasPendingFiles(): boolean {
    return this.uploadStates.some(s => s.status === 'pending');
  }
}
