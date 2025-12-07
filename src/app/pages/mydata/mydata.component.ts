import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DbConnectService, Contrat, UploadedFile } from '../../services/db-connect.service';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';
import { Subject, lastValueFrom } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { Router, RouterLink } from '@angular/router';
import { UploaderService } from '../../services/uploader.service';
import { environment } from '../../../environments/environment';
import { PaymentService, PaymentRequest } from '../../services/payment.service';
import { StripeCardComponent, StripeFactoryService, StripeService } from 'ngx-stripe';
import { StripeCardElementOptions, StripeElementsOptions } from '@stripe/stripe-js';
import { PaymentStatusPipe } from '../../pipes/payment-status.pipe';

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
  providers: [DbConnectService, StripeFactoryService],
  imports: [CommonModule, RouterLink, StripeCardComponent, PaymentStatusPipe],
  templateUrl: './mydata.component.html',
})
export class MydataComponent implements OnInit, OnDestroy {
  private clientSecret = environment.stripe_public_key;
  
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
  paymentLoading = false;
  paymentError: string | null = null;
  paymentSuccess: string | null = null;
  paymentRequests: PaymentRequest[] = [];
  paymentRequestsLoading = false;
  selectedPaymentRequest: PaymentRequest | null = null; // Pour suivre la demande de paiement sélectionnée

  @ViewChild(StripeCardComponent) card!: StripeCardComponent;

  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        fontWeight: '300',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '18px',
        '::placeholder': {
          color: '#CFD7E0'
        }
      }
    }
  };

  elementsOptions: StripeElementsOptions = {
    locale: 'fr'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private dbConnectService: DbConnectService,
    private authService: AuthService,
    private router: Router,
    private uploaderService: UploaderService, // Injecter le service
    private paymentService: PaymentService,
    private stripeService: StripeService,
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
    } else if (view === 'paiement') {
      this.loadPaymentRequests();
    } else if (view !== 'donnees' && this.user) {
      this.loadContracts(view);
    } else {
      this.contracts = []; // Vider la liste si on retourne sur "Mes Données"
    }
  }

  loadContracts(category: string): void {
    this.contractsLoading = true;
    this.contracts = []; // Vider les contrats précédents

    // Refactored logic using switchMap to avoid nested subscriptions
    this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return this.dbConnectService.getPersonByUserId(user.id);
      }),
      switchMap(person => {
        if (!person) {
          throw new Error('Person not found for the current user');
        }
        return this.dbConnectService.getContracts(person.id, category);
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (data) => {
        console.log(`[mydata.component.ts] Contrats pour la catégorie '${category}':`, data);
        this.contracts = data;
        this.contractsLoading = false;
      },
      error: (err) => {
        console.error('[mydata.component.ts] Error loading contracts:', err);
        this.contractsLoading = false;
      },
    });
  }

  loadDocuments(): void {
    this.documentsLoading = true;
    this.documents = [];

    this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return this.dbConnectService.getPersonByUserId(user.id);
      }),
      switchMap(person => {
        if (!person) {
          throw new Error('Person not found for the current user');
        }
        return this.dbConnectService.getUploadedFiles(person.id);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.documents = data;
        this.documentsLoading = false;
      },
      error: (err) => {
        console.error('[mydata.component.ts] Error loading documents:', err);
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

  loadPaymentRequests(): void {
    if (!this.user) {
      return;
    }
    this.paymentRequestsLoading = true;
    this.paymentService.getPaymentRequestsForUser(this.user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.paymentRequests = data;
        this.paymentRequestsLoading = false;
      },
      error: (err) => {
        console.error('[mydata.component.ts] Error loading payment requests:', err);
        this.paymentRequestsLoading = false;
        // Optionnel: afficher une erreur à l'utilisateur
      }
    });
  }

  /**
   * Initialise le processus de paiement pour une demande spécifique.
   * Affiche le formulaire de paiement.
   * @param request La demande de paiement à régler.
   */
  initiatePayment(request: PaymentRequest): void {
    this.selectedPaymentRequest = request;
    this.paymentError = null;
    this.paymentSuccess = null;
  }

  cancelPayment(): void {
    this.selectedPaymentRequest = null;
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

  payWithStripe(): void {
    if (!this.selectedPaymentRequest) {
      this.paymentError = "Aucune demande de paiement n'a été sélectionnée.";
      return;
    }

    this.paymentLoading = true;
    this.paymentError = null;
    this.paymentSuccess = null;

    // Montant en centimes, récupéré depuis la demande de paiement sélectionnée.
    const amount = this.selectedPaymentRequest.montant * 100;
 
    this.paymentService.createPaymentIntent(amount).pipe(
      switchMap(pi => {
        // Vérification cruciale : on doit utiliser le clientSecret retourné par l'API.
        if (!pi || !pi.clientSecret) {
          throw new Error('Le "clientSecret" est manquant. Impossible de procéder au paiement.');
        }
        // On utilise le clientSecret (pi.clientSecret) pour confirmer le paiement.
        return this.stripeService.confirmCardPayment(pi.clientSecret, {
          payment_method: {
            card: this.card.element,
            billing_details: {
              // Il est recommandé de fournir le nom complet si disponible.
              name: this.user?.email ?? 'Client Assurkin',
            },
          },
        });
      }),
      switchMap(result => {
        if (result.error) {
          // Si Stripe retourne une erreur (ex: carte refusée), on la propage.
          throw new Error(result.error.message ?? "Une erreur est survenue lors du paiement.");
        }
        if (result.paymentIntent?.status === 'succeeded') {
          // Le paiement a réussi, on met à jour la base de données.
          const updates = {
            statut: 'paid' as const, // 'as const' pour la correspondance de type
            paid_at: new Date().toISOString(),
            transaction_id: result.paymentIntent.id
          };
          return this.paymentService.updatePaymentRequestStatus(this.selectedPaymentRequest!.id, updates);
        }
        // Si le statut n'est pas 'succeeded', on retourne un observable vide pour ne rien faire.
        return new Subject<PaymentRequest>();
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (updatedRequest) => {
        this.paymentLoading = false;
        this.paymentSuccess = `Le paiement pour "${updatedRequest.sujet}" a été effectué avec succès.`;
        this.loadPaymentRequests(); // Rafraîchir la liste pour afficher le nouveau statut
        this.selectedPaymentRequest = null; // Cacher le formulaire
      },
      error: (err) => {
        // En cas d'erreur technique (ex: problème réseau, erreur API), on affiche un message générique.
        this.paymentError = err.message || "Une erreur technique est survenue. Veuillez réessayer.";
        this.paymentLoading = false;
      }
    });
  }

  closeSuccessPopup(): void {
    this.paymentSuccess = null;
  }
}