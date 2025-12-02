import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DbConnectService, Contrat, UploadedFile } from '../../services/db-connect.service';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router, RouterLink } from '@angular/router';
import { UploaderService } from '../../services/uploader.service';
import { environment } from '../../../environments/environment';

// Interface pour les devis d'assurance auto
export interface DevisAuto {
  id: number;
  type: string; // Ajout du type de véhicule depuis le devis
  date_effet: string;
  categorie: string;
  valeur: number | null; // Ajout de la valeur depuis le devis
  vehicules: {
    marque: string;
    modele: string;
  };
  personnes: { // Le preneur
    email: string;
  };
}

// Interface pour les métadonnées de l'utilisateur Supabase
export interface UserMetadata {
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-mydata',
  standalone: true,
  providers: [DbConnectService],
  imports: [CommonModule, RouterLink],
  templateUrl: './mydata.component.html',
})
export class MydataComponent implements OnInit, OnDestroy {
  user: User | null = null;
  userMetadata: UserMetadata | null = null;
  loading = true;
  activeView: string = 'donnees';
  contracts: Contrat[] = [];
  contractsLoading = false;
  devisAuto: DevisAuto[] = [];
  devisLoading = false;
  devisHabitation: any[] = []; // You can create a specific interface for this
  documents: UploadedFile[] = [];
  documentsLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private dbConnectService: DbConnectService,
    private authService: AuthService,
    private router: Router,
    private uploaderService: UploaderService, // Injecter le service
    @Inject(PLATFORM_ID) private platformId: object,
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Exécuter la récupération de l'utilisateur uniquement dans le navigateur
      this.dbConnectService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
        this.user = user;
        this.userMetadata = user?.user_metadata as UserMetadata ?? null;
        this.loading = false;
        if (user && user.id && user.email) {
          console.log('User data:', user);
          // Lier l'ID de l'utilisateur authentifié à l'enregistrement dans la table 'personnes'
          this.dbConnectService.linkUserToPerson(user.id, user.email)
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        }
      });
    } else {
      // Côté serveur, on ne charge pas l'utilisateur et on termine le chargement
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setView(view: string): void {
    this.activeView = view;
    if (view === 'documents') {
      this.loadDocuments();
    } else if (view !== 'donnees' && this.user) {
      this.loadContracts(view);
    } else {
      this.contracts = []; // Vider la liste si on retourne sur "Mes Données"
    }
  }

  loadContracts(category: string): void {
    if (!this.user) {
      return; // Ne rien faire si l'utilisateur n'est pas connecté
    }

    this.contractsLoading = true;
    this.contracts = []; // Vider les contrats précédents

    // Étape 1: Récupérer l'ID de la personne à partir de l'user_id de l'authentification
    this.dbConnectService.getPersonByUserId(this.user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe(person => {
      if (person) {
        // Étape 2: Utiliser l'ID de la personne pour charger les contrats/documents
        this.dbConnectService.getContracts(person.id, category).subscribe(data => {
          console.log(`[mydata.component.ts] Contrats pour la catégorie '${category}' et personne ID ${person.id}:`, data);
          this.contracts = data;
          this.contractsLoading = false;
        });
      } else {
        this.contractsLoading = false;
      }
    });
  }

  loadDocuments(): void {
    if (!this.user) {
      return;
    }

    this.documentsLoading = true;
    this.documents = [];

    // Étape 1: Récupérer l'ID de la personne (numérique) à partir de l'user_id de l'authentification (UUID)
    this.dbConnectService.getPersonByUserId(this.user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe(person => {
      if (person) {
        // Étape 2: Utiliser l'ID de la personne pour charger les documents
        this.dbConnectService.getUploadedFiles(person.id).subscribe(data => {
          console.log(`[mydata.component.ts] Documents pour personne ID ${person.id}:`, data);
          this.documents = data;
          this.documentsLoading = false;
        });
      } else {
        console.log('[mydata.component.ts] Aucune personne trouvée pour charger les documents.');
        this.documentsLoading = false;
      }
    });
  }

  loadDevisAuto(): void {
    if (!this.user) {
      return;
    }
    this.devisLoading = true;
    this.devisAuto = [];
    // Note: getDevisAuto est une nouvelle méthode à créer dans DbConnectService
    this.dbConnectService.getDevisAuto(this.user.id).pipe(takeUntil(this.destroy$)).subscribe((data: DevisAuto[]) => {
      this.devisAuto = data;
      this.devisLoading = false;
    });
  }

  loadDevisHabitation(): void {
    if (!this.user) {
      return;
    }
    this.devisLoading = true;
    this.devisHabitation = [];
    // Étape 1: Récupérer l'ID de la personne à partir de l'user_id de l'authentification
    this.dbConnectService.getPersonByUserId(this.user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe(person => {
      if (person) {
        // Étape 2: Utiliser l'ID de la personne pour charger les devis habitation
        this.dbConnectService.getContracts(person.id, 'habitation').subscribe((data: any[]) => {
          this.devisHabitation = data;
          console.log('Devis Habitation data:', data);
          this.devisLoading = false;
        });
      } else {
        this.devisLoading = false;
      }
    });
  }

  openDocument(file: UploadedFile): void {
    const pathParts = file.path.split('/');
    if (pathParts.length === 0) {
      console.error('Chemin du fichier invalide:', file.path);
      return;
    }

    // La catégorie (ex: "auto") est la première partie du chemin.
    const quoteType = pathParts[0];

    // Utilise la logique centralisée de UploaderService pour obtenir le nom du bucket et l'URL.
    const bucketName = this.uploaderService.getBucketName(quoteType);
    const publicUrl = this.uploaderService.getDownloadUrl(bucketName, file.path);

    if (!publicUrl) {
      console.error("Impossible de générer l'URL de téléchargement pour le fichier:", file.file_name);
      return;
    }

    // Pour forcer le téléchargement, on ajoute le paramètre 'download' à l'URL.
    const downloadUrl = `${publicUrl}?download=${encodeURIComponent(file.file_name)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.click();
  }

  async logout(): Promise<void> {
    try {
      await lastValueFrom(this.authService.signOut());
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  }
}