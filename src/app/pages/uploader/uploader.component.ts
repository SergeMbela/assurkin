import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of, forkJoin, catchError, map, finalize, switchMap, from } from 'rxjs';

// Services and Models
import { UploaderService, UploadResult } from '../../services/uploader.service';
import { ContractService, ExistingFile } from '../../services/contract.service';
import { DbConnectService, DocumentType } from '../../services/db-connect.service';
import { SendsmsService } from '../../services/sendsms.service';
import { ImatService } from '../../services/imat.service';
import { AssuranceMapperService } from '../../services/assurance-mapper.service';
import { dossierAssuranceLabels } from '../../pipes/dossier-assurance.model';
import { environment } from '../../../environments/environment';

interface UploadState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  raison: string;
  error?: string;
  filePath?: string;
}

// Interface locale pour étendre ExistingFile avec la nouvelle propriété
interface ExistingFileWithDate extends ExistingFile {
  date_created: string | Date;
}

// Type definition for a row of CSV data
type CsvRow = Record<string, string>;

@Component({
  selector: 'app-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent implements OnInit {
  // Dependency Injection
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uploaderService = inject(UploaderService);
  private contractService = inject(ContractService);
  private dbConnectService = inject(DbConnectService);
  private imatService = inject(ImatService);
  private sendsmsService = inject(SendsmsService);
  private assuranceMapperService = inject(AssuranceMapperService);

  // Component State
  quoteId!: number;
  quoteType!: string;
  
  // File Upload State
  uploadStates: UploadState[] = [];
  isUploading = false;
  uploadSuccess = false;
  errorMessage: string | null = null;
  documentTypes: DocumentType[] = [];
  existingFiles$: Observable<(ExistingFileWithDate & { downloadUrl: string | null })[]> = of([]);

  private clientInfo: any = null; // Pour stocker les infos du client (preneur)
  // CSV State
  isSavingCsvData = false;
  csvSaveSuccess = false;
  csvSaveError: string | null = null;
  csvData: CsvRow[] = [];

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.quoteId = Number(params.get('id'));
    this.quoteType = params.get('type') || '';

    if (!this.quoteId || !this.quoteType) {
      this.errorMessage = "Les informations du devis sont manquantes.";
      console.error('Quote ID or Type is missing.');
      return;
    }

    this.initData();
  }

  private initData(): void {
    // Charger les fichiers existants et générer les URLs de téléchargement signées
    this.existingFiles$ = this.contractService.getContractFiles(this.quoteId, this.quoteType).pipe(
      switchMap(files => {
        if (!files || files.length === 0) {
          return of([]); // Retourne un observable avec un tableau vide s'il n'y a pas de fichiers
        }
        // Pour chaque fichier, on crée une promesse qui génère l'URL signée
        const filesWithUrlPromises = files.map(file => {
          const downloadUrl = this.getPublicDownloadUrl(file.path);
          return Promise.resolve({ ...file, downloadUrl } as (ExistingFileWithDate & { downloadUrl: string | null })); // On retourne un nouvel objet fichier avec l'URL
        });
        // On attend que toutes les promesses soient résolues et on retourne le résultat comme un observable
        return from(Promise.all(filesWithUrlPromises));
      }),
      catchError(err => { console.error("Erreur lors de la génération des URLs signées:", err); return of([]); })
    );
    
    // Load Doc types
    this.loadDocumentTypes();

    // Load CSV Data
    this.dbConnectService.getCsvData(this.quoteId, this.quoteType).subscribe({
      next: (data) => {
        this.csvData = data;
      },
      error: (err) => console.error("Erreur chargement CSV:", err)
    });

    // Charger les informations du client pour l'envoi de SMS
    this.dbConnectService.getQuoteDetails(this.quoteType, this.quoteId).subscribe({
      next: (details) => {
        // On stocke les informations du preneur
        this.clientInfo = details?.preneur;
      },
      error: (err) => console.error("Erreur lors de la récupération des détails du devis:", err)
    });
  }

  private loadDocumentTypes(): void {
    this.dbConnectService.getDocumentTypes().subscribe({
      next: (types) => this.documentTypes = types,
      error: (err) => console.error('Erreur chargement types documents:', err)
    });
  }

  // --- FILE UPLOAD LOGIC ---

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files)
        // Prevent adding duplicates based on name
        .filter(file => !this.uploadStates.some(state => state.file.name === file.name))
        .map(file => ({
          file: file,
          status: 'pending' as const,
          raison: '', // On initialise sans valeur par défaut
          error: undefined
        }));

      // Append new files instead of overwriting
      this.uploadStates = [...this.uploadStates, ...newFiles];
      
      this.uploadSuccess = false;
      this.errorMessage = null;
      
      // Reset input value to allow selecting the same file again if needed (after deleting)
      input.value = ''; 
    }
  }

  removeFile(index: number): void {
    this.uploadStates.splice(index, 1);
  }

  onUpload(): void {
    const filesToUpload = this.uploadStates.filter(s => s.status === 'pending');
    
    if (filesToUpload.length === 0) {
      this.errorMessage = "Aucun nouveau fichier à envoyer.";
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;

    // Set status to uploading
    filesToUpload.forEach(s => s.status = 'uploading');

    this.uploaderService.uploadContractFiles(filesToUpload.map(s => s.file), this.quoteId, this.quoteType)
      .subscribe({
        next: (result: UploadResult) => {
          const state = this.uploadStates.find(s => s.file.name === result.fileName);
          if (state) {
            state.status = result.status;
            if (result.status === 'success') {
              state.filePath = result.path;
            } else {
              state.error = result.error;
            }
          }
        },
        error: (err) => {
          this.errorMessage = "Erreur technique lors de l'envoi.";
          this.isUploading = false;
        },
        complete: () => {
          this.isUploading = false;
          // Check if we have any successful uploads to save to DB
          const hasSuccess = this.uploadStates.some(s => s.status === 'success' && s.filePath && !this.isFileSaved(s));
          if (hasSuccess) {
            this.saveFilesToDbAndRefresh();
          }
          
          this.uploadSuccess = this.uploadStates.every(s => s.status === 'success');
        }
      });
  }

  // Helper to prevent re-saving files if logic is called multiple times
  private isFileSaved(state: UploadState): boolean {
    // Implementation depends on if you want to track this flag, 
    // strictly unnecessary if uploadStates are cleared or ignored after save.
    return false; 
  }

  private saveFilesToDbAndRefresh(): void {
    const successfulUploads = this.uploadStates
      .filter(s => s.status === 'success' && s.filePath);

    if (successfulUploads.length === 0) return;

    const tasks$ = successfulUploads.map(s => {
      // Affiche le type de document (raison) dans la console pour chaque fichier.
      console.log(`Fichier téléversé : '${s.file.name}', Type : '${s.raison}'`);

      return this.contractService.addContractFile(
        this.quoteId, 
        this.quoteType, 
        s.filePath!, 
        s.file.name, 
        s.raison
      ).pipe(
        // Catch individual errors so one failure doesn't stop the others
        catchError(err => {
          console.error(`Failed to save ref for ${s.file.name}`, err);
          s.error = "Erreur sauvegarde BDD";
          s.status = 'error';
          return of(null);
        })
      )
    });

    forkJoin(tasks$).subscribe({
      next: () => {
        console.log('Synchronisation BDD terminée.');
        // On rafraîchit la liste des fichiers en appliquant la même logique que dans initData()
        this.existingFiles$ = this.contractService.getContractFiles(this.quoteId, this.quoteType).pipe(
          switchMap(files => {
            if (!files || files.length === 0) {
              return of([]);
            }
            const filesWithUrlPromises = files.map(file => {
              const downloadUrl = this.getPublicDownloadUrl(file.path);
              return { ...file, downloadUrl } as (ExistingFileWithDate & { downloadUrl: string | null });
            });
            return from(Promise.all(filesWithUrlPromises));
          }),
          catchError(err => { console.error("Erreur lors du rafraîchissement des URLs signées:", err); return of([]); })
        );

        // Clean up successful uploads from the list so user sees they are done
        this.uploadStates = this.uploadStates.filter(s => s.status !== 'success');
      },
      complete: () => {
        // Vérifier si un contrat a été uploadé et envoyer un SMS
        const contractUpload = successfulUploads.find(s => s.raison === 'Contrat');
        if (contractUpload && this.clientInfo?.telephone) {
          this.sendContractSms(this.clientInfo.telephone, this.clientInfo.prenom);
        } else if (contractUpload) {
          console.warn("Un contrat a été uploadé mais aucun numéro de téléphone n'a été trouvé pour le client.");
          this.errorMessage = "Contrat sauvegardé, mais le SMS n'a pas pu être envoyé (numéro de téléphone manquant).";
        }
      },
      error: (err) => {
        this.errorMessage = "Erreur critique lors de la sauvegarde.";
      }
    });
  }

  // --- CSV LOGIC ---

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const text = e.target.result;
        this.csvData = this.csvToJSON(text);
        this.resetCsvSaveStatus();
      };

      reader.readAsText(file);
    }
  }

  private csvToJSON(csvText: string): CsvRow[] {
    if (!csvText || csvText.trim() === '') return [];

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim());
    
    // Create translation map
    const translatedHeaders = headers.map(header => 
      this.assuranceMapperService.getFrenchTranslation(header) || header
    );

    const result: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine || currentLine.trim() === '') continue;

      const data = currentLine.split(';');
      const obj: CsvRow = {};

      // Ensure we don't go out of bounds if data is shorter than headers
      for (let j = 0; j < translatedHeaders.length; j++) {
        const value = data[j] ? data[j].trim() : '';
        obj[translatedHeaders[j]] = value;
      }
      
      // Filter out completely empty rows
      if (Object.values(obj).some(val => val !== '')) {
        result.push(obj);
      }
    }
    return result;
  }

  onSaveCsvData(): void {
    if (!this.csvData.length) {
      this.csvSaveError = "Aucune donnée.";
      return;
    }

    this.isSavingCsvData = true;
    this.resetCsvSaveStatus();

    this.dbConnectService.saveCsvDataToDb(this.quoteId, this.quoteType, this.csvData)
      .pipe(finalize(() => this.isSavingCsvData = false))
      .subscribe({
        next: () => {
          this.csvSaveSuccess = true;
          // Refresh data from server to be sure
           this.dbConnectService.getCsvData(this.quoteId, this.quoteType).subscribe(data => this.csvData = data);
        },
        error: (err) => {
          this.csvSaveError = err.message || "Erreur de sauvegarde.";
        }
      });
  }

  private resetCsvSaveStatus(): void {
    this.csvSaveSuccess = false;
    this.csvSaveError = null;
  }

  // --- UTILS & NAVIGATION ---

  getFriendlyHeader(key: string): string {
    return dossierAssuranceLabels[key] || key;
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
  
  hasPendingFiles(): boolean {
    return this.uploadStates.some(s => s.status === 'pending');
  }

  /**
   * Vérifie si tous les fichiers en attente ont un type de document sélectionné.
   * @returns `true` si tous les fichiers en attente ont un type, sinon `false`.
   */
  allPendingFilesHaveReason(): boolean {
    const pendingFiles = this.uploadStates.filter(s => s.status === 'pending');
    return pendingFiles.every(s => s.raison && s.raison.trim() !== '');
  }

  /**
   * Génère une URL de téléchargement publique pour un fichier.
   * @param filePath Le chemin du fichier dans le bucket Supabase Storage.
   * @returns L'URL de téléchargement publique.
   */
  getPublicDownloadUrl(filePath: string): string | null {
    const bucketName = 'documents_auto';
    try {
      // Utilise la méthode du service pour obtenir l'URL publique
      const { data } = this.dbConnectService.getPublicUrl(bucketName, filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Erreur inattendue dans getPublicDownloadUrl:', error);
      return null;
    }
  }

  /**
   * Envoie un SMS pour notifier le client de la réception du contrat.
   * @param phoneNumber Le numéro de téléphone du client.
   * @param clientName Le prénom du client.
   */
  private async sendContractSms(phoneNumber: string, clientName: string): Promise<void> {
    const message = `Bonjour ${clientName}, votre contrat est disponible dans votre espace client. Veuillez le signer. L'équipe Assurkins. ${environment.website}`;
    try {
      await this.sendsmsService.sendSms(phoneNumber, message);
      console.log('SMS de confirmation de contrat envoyé avec succès.');
    } catch (error) {
      console.error("Échec de l'envoi du SMS de confirmation de contrat:", error);
      // Afficher une erreur non bloquante à l'utilisateur
      this.errorMessage = "Le contrat a été sauvegardé, mais une erreur est survenue lors de l'envoi du SMS de confirmation.";
    }
  }

  goBack(): void {
    const managementPage = this.quoteType === 'auto' 
      ? '/intranet/dashboard/auto-management' 
      : '/intranet/dashboard';
    this.router.navigate([managementPage]);
  }
}