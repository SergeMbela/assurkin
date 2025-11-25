import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { UploaderService, UploadResult } from '../../services/uploader.service';
import { ContractService } from '../../services/contract.service';
import { environment } from '../../../environments/environment';

// Interface pour suivre l'état de chaque fichier
interface UploadState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uploaderService = inject(UploaderService);
  private contractService = inject(ContractService);

  quoteId!: number;
  quoteType!: string;

  uploadStates: UploadState[] = [];
  isUploading = false;
  uploadSuccess = false;
  errorMessage: string | null = null;

  // Propriétés pour afficher les fichiers existants
  existingFiles$: Observable<string[]> = of([]);
  private supabaseUrl = environment.supabaseUrl;

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
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      // Initialiser l'état pour chaque nouveau fichier sélectionné
      this.uploadStates = Array.from(input.files).map(file => ({
        file: file,
        status: 'pending'
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
            state.error = result.error;
          }
        },
        complete: () => {
          this.isUploading = false;
          // Vérifier si tous les uploads ont réussi
          const allSucceeded = this.uploadStates.every(s => s.status === 'success');
          this.uploadSuccess = allSucceeded;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/management']);
  }

  hasPendingFiles(): boolean {
    return this.uploadStates.some(s => s.status === 'pending');
  }

  /**
   * Construit l'URL de téléchargement public pour un fichier dans Supabase Storage.
   * @param filePath Le chemin complet du fichier (ex: auto/123/fichier.pdf)
   * @returns L'URL de téléchargement.
   */
  getDownloadUrl(filePath: string): string {
    // Le nom du bucket est la première partie du chemin du fichier (ex: 'auto' devient 'documents_auto')
    const bucketName = (filePath.startsWith('auto') ? 'documents_auto' : filePath.startsWith('habitation') ? 'documents_habitation' : filePath.startsWith('obseques') ? 'documents_obseques' : filePath.startsWith('rc') ? 'documents_rc' : filePath.startsWith('voyage') ? 'documents_voyage' : 'documents_autres');
    return `${this.supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
  }
}
