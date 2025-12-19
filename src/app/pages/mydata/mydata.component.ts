import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of, lastValueFrom } from 'rxjs';
import { takeUntil, tap, switchMap, catchError } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { AuthService } from '../../services/auth.service';
import { DbConnectService, Person, Contrat, UploadedFile, DocumentType } from '../../services/db-connect.service';
import { PaymentService, PaymentRequest } from '../../services/payment.service';
import { StorecoveService } from '../../services/storecove.service';
import { MailService } from '../../services/mail.service';
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
  payments: PaymentRequest[] = [];
  paymentsLoading = false;
  paymentStatusFilter: string = 'all';
  paginatedPayments: PaymentRequest[] = [];
  paymentsCurrentPage: number = 1;
  paymentsItemsPerPage: number = 5;
  successPaymentRequestId: number | null = null;
  successPaymentRequest: PaymentRequest | null | undefined = null;
  paymentResultStatus: 'success' | 'error' = 'success';

  // Variables pour le paiement Stripe
  isPaymentModalOpen = false;
  stripeClientSecret: string | null = null;
  showPaymentSuccessModal = false;
  selectedPaymentRequest: PaymentRequest | null = null;
  isPaymentIntentLoading = false;
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  isPaymentProcessing = false;

  // Propriétés pour la popup de notification
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  private popupTimeout: any;

  @ViewChild('fileInput') fileInput!: ElementRef;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dbConnectService: DbConnectService,
    private paymentService: PaymentService,
    private storecoveService: StorecoveService,
    private mailService: MailService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        const redirectStatus = params['redirect_status'];
        if (redirectStatus === 'succeeded') {
          this.paymentResultStatus = 'success';
          this.successPaymentRequestId = params['payment_request_id'] ? Number(params['payment_request_id']) : null;
          this.mailService.sendEmail({
            to: 'developer@assurkin.be',
            subject: 'Nouveau paiement reçu',
            htmlContent: `<p>Un paiement a été effectué avec succès.</p>`
          }).subscribe({
            next: () => {
              // Nettoyer les paramètres de l'URL pour éviter les doublons au rafraîchissement
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { redirect_status: null, payment_intent: null, payment_intent_client_secret: null, payment_request_id: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
              });
              this.showPaymentSuccessModal = true;
            },
            error: (err) => {
              console.error('Erreur lors de l\'envoi de l\'email de confirmation de paiement', err);
              // Même si l'email échoue, le paiement a réussi
              this.showPaymentSuccessModal = true;
            }
          });
        } else if (redirectStatus === 'failed') {
          this.paymentResultStatus = 'error';
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { redirect_status: null, payment_intent: null, payment_intent_client_secret: null, payment_request_id: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
          this.showPaymentSuccessModal = true;
        }
      });

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
          } else if (this.activeView === 'paiements') {
            this.loadPayments();
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
    } else if (view === 'paiements') {
      this.loadPayments();
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

  loadPayments() {
    if (!this.person) return;
    this.paymentsLoading = true;
    this.paymentService.getPaymentRequestsByPreneur(this.person.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.payments = data;
          this.paymentsLoading = false;
          this.paymentsCurrentPage = 1;
          this.updatePaginatedPayments();
          
          if (this.successPaymentRequestId) {
            this.successPaymentRequest = this.payments.find(p => p.id === this.successPaymentRequestId);
          }
        },
        error: (err) => {
          console.error('Erreur chargement paiements', err);
          this.paymentsLoading = false;
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

  openPaymentModal(payment: PaymentRequest) {
    this.selectedPaymentRequest = payment;
    this.isPaymentIntentLoading = true;
    
    // Conversion en centimes (x100) car Stripe attend des centimes pour l'EUR
    const amountInCents = Math.round(payment.montant * 100);

    this.paymentService.createPaymentIntent(amountInCents, { payment_request_id: payment.id.toString() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          this.stripeClientSecret = res.clientSecret;
          this.isPaymentModalOpen = true;
          this.isPaymentIntentLoading = false;

          // Initialisation de Stripe
          if (!this.stripe) {
            this.stripe = await loadStripe(environment.stripe_public_key);
          }

          if (this.stripe && this.stripeClientSecret) {
            // Petit délai pour s'assurer que la div #stripe-payment-element est rendue par le *ngIf
            setTimeout(() => {
              this.elements = this.stripe!.elements({ clientSecret: this.stripeClientSecret!, appearance: { theme: 'stripe' } });
              const paymentElement = this.elements.create('payment');
              paymentElement.mount('#stripe-payment-element');
            }, 100);
          }
        },
        error: (err) => {
          console.error('Erreur création intention paiement:', err);
          this.isPaymentIntentLoading = false;
          this.showNotification('Impossible d\'initialiser le paiement. Veuillez réessayer plus tard.', 'error');
        }
      });
  }

  async confirmPayment() {
    if (!this.stripe || !this.elements || !this.selectedPaymentRequest) return;
    
    this.isPaymentProcessing = true;

    // Construit l'URL de retour avec l'ID de la demande de paiement
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('payment_request_id', this.selectedPaymentRequest.id.toString());

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        // Redirection vers la même page après paiement pour gérer le succès
        return_url: returnUrl.toString(), 
      },
    });

    if (error) {
      this.isPaymentProcessing = false;
      
      let errorMessage = error.message || 'Une erreur est survenue lors du paiement.';

      // Traduction des messages d'erreur courants pour une meilleure expérience utilisateur
      if (error.type === 'card_error' || error.type === 'validation_error') {
        switch (error.code) {
          case 'card_declined':
            errorMessage = "Votre carte a été refusée. Veuillez contacter votre banque.";
            break;
          case 'expired_card':
            errorMessage = "Votre carte a expiré.";
            break;
          case 'incorrect_cvc':
            errorMessage = "Le code de sécurité (CVC) est incorrect.";
            break;
          case 'processing_error':
            errorMessage = "Une erreur est survenue lors du traitement de la carte. Veuillez réessayer.";
            break;
          case 'insufficient_funds':
            errorMessage = "Fonds insuffisants sur la carte.";
            break;
        }
      }
      
      this.showNotification(errorMessage, 'error');
    } else {
      // Le client sera redirigé, pas besoin de changer l'état ici
    }
  }

  closePaymentModal() {
    this.isPaymentModalOpen = false;
    this.stripeClientSecret = null;
    this.selectedPaymentRequest = null;
    this.elements = null;
    this.isPaymentProcessing = false;
  }

  closePaymentSuccessModal() {
    this.showPaymentSuccessModal = false;
    this.successPaymentRequest = null;
    this.successPaymentRequestId = null;
  }

  downloadInvoice(payment: PaymentRequest) {
    if (!payment?.storecove_invoice_id) return;
    
    // On utilise une notification pour indiquer le début du téléchargement
    this.showNotification("Téléchargement de la facture en cours...", 'success');

    this.storecoveService.downloadInvoice(payment.storecove_invoice_id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `facture_${payment.storecove_invoice_id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Erreur téléchargement facture', err);
        this.showNotification("Impossible de télécharger la facture.", 'error');
      }
    });
  }

  printInvoice(payment: PaymentRequest) {
    if (!payment?.storecove_invoice_id) return;

    this.showNotification("Préparation de l'impression...", 'success');

    this.storecoveService.downloadInvoice(payment.storecove_invoice_id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      },
      error: (err: any) => {
        console.error('Erreur impression facture', err);
        this.showNotification("Impossible de récupérer la facture pour impression.", 'error');
      }
    });
  }

  showNotification(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    if (this.popupTimeout) clearTimeout(this.popupTimeout);
    this.popupTimeout = setTimeout(() => this.hideNotification(), 5000);
  }

  hideNotification() {
    this.showPopup = false;
    if (this.popupTimeout) clearTimeout(this.popupTimeout);
  }

  getPaymentStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'pending': return 'En attente';
      case 'paid': return 'Payé';
      case 'failed': return 'Échoué';
      case 'cancelled': return 'Annulé';
      case 'overdue': return 'En retard';
      default: return status || 'Inconnu';
    }
  }

  getPaymentStatusClass(status: string | undefined): string {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  get filteredPayments(): PaymentRequest[] {
    if (this.paymentStatusFilter === 'all') {
      return this.payments;
    }
    return this.payments.filter(p => p.statut === this.paymentStatusFilter);
  }

  onPaymentFilterChange() {
    this.paymentsCurrentPage = 1;
    this.updatePaginatedPayments();
  }

  updatePaginatedPayments() {
    const filtered = this.filteredPayments;
    const startIndex = (this.paymentsCurrentPage - 1) * this.paymentsItemsPerPage;
    const endIndex = startIndex + this.paymentsItemsPerPage;
    this.paginatedPayments = filtered.slice(startIndex, endIndex);
  }

  goToPaymentsPage(page: number) {
    this.paymentsCurrentPage = page;
    this.updatePaginatedPayments();
  }

  getTotalPaymentPages(): number {
    return Math.ceil(this.filteredPayments.length / this.paymentsItemsPerPage);
  }

  getPaymentPagesArray(): number[] {
    return Array(this.getTotalPaymentPages()).fill(0).map((x, i) => i + 1);
  }
}