import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of, lastValueFrom } from 'rxjs';
import { takeUntil, tap, switchMap, catchError } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';

import { AuthService } from '../../services/auth.service';
import { DbConnectService, Person, Contrat, UploadedFile, DocumentType } from '../../services/db-connect.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mydata',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mydata.component.html',
})
export class MydataComponent implements OnInit, OnDestroy {
  user: User | null = null;
  person: Person | null = null;
  loading = true;
  activeView: string = 'donnees';
  contracts: Contrat[] = [];
  contractsLoading = false;
  activeInsuranceCategory: string = 'auto';
  documents: UploadedFile[] = [];
  paginatedDocuments: UploadedFile[] = [];
  documentsCurrentPage: number = 1;
  documentsItemsPerPage: number = 5;
  documentTypes: DocumentType[] = [];
  selectedDocTypeId: number | null = null;
  uploading = false;

  @ViewChild('fileInput') fileInput!: ElementRef;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dbConnectService: DbConnectService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.currentUser$
        .pipe(
          takeUntil(this.destroy$),
          tap(() => (this.loading = true)),
          switchMap((user) => {
            this.user = user;
            if (user && user.id && user.email) {
              // Lier l'utilisateur à son profil 'personne' et récupérer les données
              return this.dbConnectService.linkUserToPerson(user.id, user.email).pipe(
                switchMap(() => this.dbConnectService.getPersonByUserId(user.id)),
                catchError((err) => {
                  console.error('Erreur lors de la récupération du profil:', err);
                  return of(null);
                })
              );
            }
            return of(null);
          })
        )
        .subscribe((person) => {
          this.person = person;
          this.loading = false;
          if (this.activeView === 'assurances') {
            this.loadContracts(this.activeInsuranceCategory);
          } else if (this.activeView === 'documents') {
            this.loadDocuments();
            this.loadDocumentTypes();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setView(view: string) {
    this.activeView = view;
    if (view === 'assurances') {
      this.loadContracts(this.activeInsuranceCategory);
    } else if (view === 'documents') {
      this.loadDocuments();
      this.loadDocumentTypes();
    }
  }

  setInsuranceCategory(category: string) {
    this.activeInsuranceCategory = category;
    this.loadContracts(category);
  }

  loadContracts(category: string) {
    if (!this.person) return;
    this.contractsLoading = true;
    this.dbConnectService.getContracts(this.person.id, category)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.contracts = data;
          this.contractsLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des contrats:', err);
          this.contractsLoading = false;
        }
      });
  }

  loadDocuments() {
    if (!this.person) return;
    this.dbConnectService.getDocuments(this.person.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: UploadedFile[]) => {
          this.documents = data;
          this.documentsCurrentPage = 1; // Revenir à la première page
          this.updatePaginatedDocuments();
        },
        error: (err: any) => {
          console.error('Erreur lors du chargement des documents:', err);
          this.documents = []; // En cas d'erreur, on s'assure que la liste est vide
          this.updatePaginatedDocuments();
        }
      });
  }

  loadDocumentTypes() {
    this.dbConnectService.getDocumentTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // On ne garde que les types de documents pertinents pour l'espace client
          const relevantLabels = ['auto', 'habitation', 'obsèques', 'obseques'];
          this.documentTypes = data.filter(type => 
            relevantLabels.some(label => type.Label.toLowerCase().includes(label))
          );
        },
        error: (err) => console.error('Erreur chargement types documents', err)
      });
  }

  selectDocType(typeId: number) {
    this.selectedDocTypeId = typeId;
    // Réinitialise le champ de fichier si l'utilisateur change de catégorie
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: any, specificBucket?: string) {
    const file: File = event.target.files[0];
    const input = event.target as HTMLInputElement;

    if (file && this.person && this.user) {
      // Validation de la taille du fichier (5 Mo max)
      const maxSize = 5 * 1024 * 1024; // 5 Mo
      if (file.size > maxSize) {
        alert("Le fichier est trop volumineux. La taille maximale autorisée est de 5 Mo.");
        input.value = '';
        return;
      }

      // Validation du type de fichier
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert("Format de fichier non supporté. Veuillez utiliser un fichier PDF, une image (JPG, PNG) ou un document Word.");
        input.value = '';
        return;
      }

      if (!specificBucket && !this.selectedDocTypeId) {
        // Ce cas ne devrait pas arriver avec la nouvelle UI, mais reste une sécurité.
        alert("Veuillez d'abord sélectionner une catégorie.");
        return;
      }

      // Déterminer le nom du bucket en fonction du type de document
      let bucketName = specificBucket || environment.storage_bucket_clients; // Valeur par défaut
      
      if (!specificBucket && this.selectedDocTypeId) {
        const selectedType = this.documentTypes.find(t => t.id === this.selectedDocTypeId);
        if (selectedType) {
          const label = selectedType.Label.toLowerCase();
          if (label.includes('auto')) bucketName = 'documents_auto';
          else if (label.includes('habitation')) bucketName = 'documents_habitation';
          else if (label.includes('obsèques') || label.includes('obseques')) bucketName = 'documents_obseques';
        }
      }

      this.uploading = true;
      const typeId = specificBucket ? 0 : (this.selectedDocTypeId || 0);

      this.dbConnectService.uploadDocument(file, this.person.id, this.user.id, typeId, bucketName)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newDoc) => {
            this.documents.unshift(newDoc); // Ajoute le nouveau document en haut de la liste
            this.updatePaginatedDocuments();
            this.uploading = false;
            // On ne réinitialise pas la catégorie, mais on vide le champ de fichier
            input.value = '';
          },
          error: (err) => {
            console.error('Erreur lors du téléversement:', err);
            this.uploading = false;
            input.value = '';
            alert("Une erreur est survenue lors de l'envoi du document.");
          }
        });
    }
  }

  async downloadDocument(doc: UploadedFile) {
    let bucketName = environment.storage_bucket_clients;
    if (doc.id_type === 0) {
      bucketName = 'documents_clients';
    } else if (doc.id_type) {
      const type = this.documentTypes.find(t => t.id === doc.id_type);
      if (type) {
        const label = type.Label.toLowerCase();
        if (label.includes('auto')) bucketName = 'documents_auto';
        else if (label.includes('habitation')) bucketName = 'documents_habitation';
        else if (label.includes('obsèques') || label.includes('obseques')) bucketName = 'documents_obseques';
      }
    }

    try {
      const { data, error } = await this.dbConnectService.createSignedUrl(bucketName, doc.path, 60);
      if (error || !data?.signedUrl) {
        console.error('Erreur lors de la génération du lien de téléchargement:', error);
        alert("Impossible de télécharger le document.");
        return;
      }
      
      const link = document.createElement('a');
      // On ajoute le paramètre download pour que Supabase serve le fichier avec Content-Disposition: attachment
      link.href = `${data.signedUrl}&download=${encodeURIComponent(doc.file_name)}`;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      alert("Une erreur est survenue lors du téléchargement.");
    }
  }

  deleteDocument(doc: UploadedFile) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    let bucketName = environment.storage_bucket_clients;
    if (doc.id_type === 0) {
      bucketName = 'documents_clients';
    } else if (doc.id_type) {
      const type = this.documentTypes.find(t => t.id === doc.id_type);
      if (type) {
        const label = type.Label.toLowerCase();
        if (label.includes('auto')) bucketName = 'documents_auto';
        else if (label.includes('habitation')) bucketName = 'documents_habitation';
        else if (label.includes('obsèques') || label.includes('obseques')) bucketName = 'documents_obseques';
      }
    }

    this.dbConnectService.deleteDocument(doc.id, doc.path, bucketName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.documents = this.documents.filter(d => d.id !== doc.id);
          this.updatePaginatedDocuments();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          alert("Une erreur est survenue lors de la suppression du document.");
        }
      });
  }

  updatePaginatedDocuments() {
    const startIndex = (this.documentsCurrentPage - 1) * this.documentsItemsPerPage;
    const endIndex = startIndex + this.documentsItemsPerPage;
    this.paginatedDocuments = this.documents.slice(startIndex, endIndex);

    // Si la page actuelle devient vide après une suppression, on retourne à la page précédente
    if (this.paginatedDocuments.length === 0 && this.documents.length > 0) {
      this.documentsCurrentPage = Math.max(1, this.documentsCurrentPage - 1);
      this.updatePaginatedDocuments();
    }
  }

  goToDocumentsPage(page: number) {
    this.documentsCurrentPage = page;
    this.updatePaginatedDocuments();
  }

  getTotalDocumentPages(): number {
    return Math.ceil(this.documents.length / this.documentsItemsPerPage);
  }

  getDocumentPagesArray(): number[] {
    return Array(this.getTotalDocumentPages()).fill(0).map((x, i) => i + 1);
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'fa-file-pdf text-red-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'fa-file-image text-blue-500';
      case 'doc':
      case 'docx':
        return 'fa-file-word text-blue-700';
      case 'xls':
      case 'xlsx':
        return 'fa-file-excel text-green-600';
      default:
        return 'fa-file text-gray-400';
    }
  }

  truncateFileName(fileName: string): string {
    if (!fileName) {
      return '';
    }
    const parts = fileName.split('.');
    // Gère les fichiers sans extension ou avec plusieurs points
    const extension = parts.length > 1 ? '.' + parts.pop() : '';
    const name = parts.join('.');

    if (name.length > 6) {
      return name.substring(0, 6) + '...' + extension;
    }

    return fileName;
  }

  async logout(): Promise<void> {
    try {
      await lastValueFrom(this.authService.signOut());
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}