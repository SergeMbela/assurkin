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
  preneurId!: number;

  // File Upload State
  uploadStates: UploadState[] = [];
  isUploading = false;
  globalUploadProgress = 0; // Pour la barre de progression globale
  uploadSuccess = false;
  errorMessage: string | null = null;
  documentTypes: DocumentType[] = [];
  existingFiles$: Observable<(ExistingFileWithDate & { downloadUrl: string | null })[]> = of([]);

  private clientInfo: any = null; // Pour stocker les infos du client (preneur)
  // CSV State
  isSavingCsvData = false;
  isParsingCsv = false; // Pour l'indicateur de chargement lors de la lecture du fichier
  csvSaveSuccess = false;
  csvSaveError: string | null = null;
  csvData: CsvRow[] = [];

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.quoteId = Number(params.get('id'));
    this.quoteType = params.get('type') || '';
    this.preneurId = Number(params.get('preneurId'));

    if (!this.quoteId || !this.quoteType || !this.preneurId) {
      this.errorMessage = "Les informations du devis ou du preneur sont manquantes.";
      console.error('Quote ID, Type or Preneur ID is missing.');
      return;
    }

    this.initData();
  }

  private initData(): void {
    // Charger les fichiers existants et générer les URLs de téléchargement signées
    this.refreshExistingFiles$();

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
    this.globalUploadProgress = 0; // Réinitialiser la progression

    // Set status to uploading
    filesToUpload.forEach(s => s.status = 'uploading');

    this.uploaderService.uploadContractFiles(filesToUpload.map(s => s.file), this.quoteId, this.quoteType)
      .subscribe({
        next: (result: UploadResult) => {
          // Mettre à jour la progression globale
          if (typeof result.totalProgress === 'number') {
            this.globalUploadProgress = result.totalProgress;
          }

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
          this.globalUploadProgress = 0;
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
        s.raison,
        this.preneurId // Ajout du preneurId
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
        this.refreshExistingFiles$();

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
      this.resetCsvSaveStatus();
      this.isParsingCsv = true;
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const text = e.target.result;
          const jsonData = this.csvToJSON(text);
          if (jsonData.length === 0) {
            throw new Error("Le fichier CSV est vide ou ne contient pas de données valides.");
          }
          this.csvData = jsonData;
        } catch (error: any) {
          this.csvSaveError = error.message;
          this.csvData = []; // Vider les données en cas d'erreur
        } finally {
          this.isParsingCsv = false;
        }
      };

      reader.readAsText(file);
      input.value = ''; // Permet de resélectionner le même fichier
    }
  }

  private csvToJSON(csvText: string): CsvRow[] {
    if (!csvText || csvText.trim() === '') return [];

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("Le fichier CSV doit contenir au moins un en-tête et une ligne de données.");

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
      this.csvSaveError = "Aucune donnée à sauvegarder. Veuillez sélectionner un fichier CSV valide.";
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
          this.csvSaveError = `Erreur lors de la sauvegarde : ${err.message || "Une erreur inconnue est survenue."}`;
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
   * Récupère les fichiers existants pour le devis, génère leurs URLs de téléchargement,
   * et met à jour l'observable `existingFiles$`.
   */
  private refreshExistingFiles$(): void {
    this.existingFiles$ = this.contractService.getContractFiles(this.quoteId, this.quoteType).pipe(
      map((files: ExistingFile[]) => {
        if (!files || files.length === 0) {
          return [];
        }
        // Pour chaque fichier, on génère l'URL de téléchargement
        return (files as ExistingFileWithDate[]).map(file => {
          const downloadUrl = this.getPublicDownloadUrl(file.path, this.quoteType);
          return { ...file, downloadUrl };
        });
      }),
      // Gère les erreurs de manière centralisée
      catchError(err => { console.error("Erreur lors du rafraîchissement de la liste des fichiers:", err); return of([]); })
    );
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
  getPublicDownloadUrl(filePath: string, quoteType: string): string | null {
    if (!filePath || !quoteType) return null;

    // Utilise la méthode centralisée du service pour obtenir le nom du bucket.
    const bucketName = this.uploaderService.getBucketName(quoteType);

    // S'assure que le chemin ne commence pas par un '/' pour éviter les doubles slashes dans l'URL finale.
    const cleanedFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

    // Utilise la méthode centralisée du service pour construire l'URL.
    // Cela garantit que la logique de construction de l'URL est cohérente dans toute l'application.
    return this.uploaderService.getDownloadUrl(bucketName, cleanedFilePath);
  }

  /**
   * Déclenche le téléchargement d'un fichier existant.
   * @param file L'objet fichier contenant le nom et l'URL de téléchargement.
   */
  downloadFile(file: { file_name: string, downloadUrl: string | null }): void {
    if (!file.downloadUrl) {
      console.error('URL de téléchargement non disponible pour le fichier:', file.file_name);
      return;
    }
    // La logique de création de lien temporaire est la même que dans mydata.component.ts
    // On utilise le paramètre `?download` de l'URL Supabase pour forcer le téléchargement
    // et spécifier le nom du fichier. L'attribut `download` de la balise <a> est ignoré
    // par les navigateurs pour les URL cross-origin.
    const link = document.createElement('a');
    link.href = `${file.downloadUrl}?download=${encodeURIComponent(file.file_name)}`;
    link.click(); // Simuler un clic sur le lien suffit pour démarrer le téléchargement.
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