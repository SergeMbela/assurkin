import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl, AbstractControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { SendsmsService } from '../../services/sendsms.service';
import { MailService, EmailData } from '../../services/mail.service';
import { DbConnectService, Person, Assureur, Commission } from '../../services/db-connect.service';
import { PaymentService } from '../../services/payment.service';
import { StorecoveService } from '../../services/storecove.service';

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './messagerie.component.html',
})
export class MessagerieComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private smsService = inject(SendsmsService);
  private mailService = inject(MailService);
  private dbService = inject(DbConnectService);
  private paymentService = inject(PaymentService);
  private storecoveService = inject(StorecoveService);

  activeTab: 'sms' | 'email' | 'payment' | 'commissions' = 'sms';

  smsForm!: FormGroup;
  emailForm!: FormGroup;
  paymentForm!: FormGroup;
  commissionForm!: FormGroup;

  quoteId: number | null = null;
  quoteType: string | null = null;
  preneurDetails: Person | null = null;
  currentUserUid: string | null = null;

  loading = false;
  successMessage: string | null = null;
  warningMessage: string | null = null;
  errorMessage: string | null = null;
  payments: any[] = [];

  // Options pour le select du sujet de paiement
  paymentSubjects = [
    { value: 'acompte', label: 'Acompte' },
    { value: 'solde', label: 'Solde du devis' },
    { value: 'regularisation', label: 'Régularisation' },
    { value: 'autre', label: 'Autre' }
  ];

  commissionCategories = [
    { value: 'commission_bancaire', label: 'Commission bancaire' },
    { value: 'frais_dossier', label: 'Frais de dossier' },
    { value: 'commission_assurance', label: "Commission d'assurance" }
  ];

  insuranceCompanies$: Observable<Assureur[]> | null = null;

  ngOnInit(): void {
    this.smsForm = this.fb.group({
      to: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.maxLength(160)]],
    });

    this.emailForm = this.fb.group({
      to: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required]],
      htmlContent: ['', [Validators.required]],
    });

    this.paymentForm = this.fb.group({
      sujet: ['', Validators.required],
      montant: [null, [Validators.required, Validators.min(0.01)]],
      dateEcheance: ['', [Validators.required, this.futureDateValidator]],
      remarques: ['']
    });

    this.commissionForm = this.fb.group({
      categorie: ['', Validators.required],
      montant: [null, [Validators.required, Validators.min(0.01)]],
      dateEcheance: ['', Validators.required],
      datePaiement: [''],
      compagnie: ['']
    });

    this.insuranceCompanies$ = this.dbService.getAllAssureurs();

    this.route.paramMap.pipe(
      tap(params => {
        this.quoteId = Number(params.get('id'));
        this.quoteType = params.get('type');
        if (this.activeTab === 'commissions' || this.activeTab === 'payment') {
          this.loadPayments();
        }
      }),
      switchMap(() => this.dbService.getFullQuoteDetails(this.quoteId!))
    ).subscribe(details => {
      if (details && details.preneur) {
        console.log('Détails du preneur reçus:', details.preneur); // Log pour vérifier les données
        this.preneurDetails = details.preneur;
        this.smsForm.patchValue({ to: this.preneurDetails?.telephone });
        this.emailForm.patchValue({ to: this.preneurDetails?.email });
      }
    });

    this.dbService.getCurrentUser().subscribe(user => {
      this.currentUserUid = user?.id ?? null;
    });
  }

  setActiveTab(tab: 'sms' | 'email' | 'payment' | 'commissions'): void {
    this.activeTab = tab;
    this.resetMessages();
    if (tab === 'commissions' || tab === 'payment') {
      this.loadPayments();
    }
  }

  sendSms(): void {
    if (this.smsForm.invalid) return;
    this.loading = true;
    this.resetMessages();

    const { to, message } = this.smsForm.value;
    this.smsService.sendSms(to, message)
      .then(async () => {
        this.successMessage = 'SMS envoyé avec succès !';
        await this.saveMessageToDb('sms', 'sent', {
          recipient: to,
          content: message
        });
        this.smsForm.get('message')?.reset();
      })
      .catch(async (err) => {
        await this.saveMessageToDb('sms', 'failed', {
          recipient: to,
          content: message,
          error: err.message
        });
        this.errorMessage = err.message || "Une erreur est survenue lors de l'envoi du SMS.";
      })
      .finally(() => this.loading = false);
  }

  sendEmail(): void {
    if (this.emailForm.invalid) return;
    this.loading = true;
    this.resetMessages();

    const emailData: EmailData = this.emailForm.value;
    this.mailService.sendEmail(emailData)
      .toPromise()
      .then(async (response: any) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }
        await this.saveMessageToDb('email', 'sent', {
          recipient: emailData.to,
          subject: emailData.subject,
          content: emailData.htmlContent
        });
        this.successMessage = 'E-mail envoyé avec succès !';
        this.emailForm.get('subject')?.reset();
        this.emailForm.get('htmlContent')?.reset();
      })
      .catch(async (err) => {
        await this.saveMessageToDb('email', 'failed', {
          recipient: emailData.to,
          subject: emailData.subject,
          content: emailData.htmlContent,
          error: err.message
        });
        this.errorMessage = err.error?.error || "Une erreur est survenue lors de l'envoi de l'e-mail.";
      })
      .finally(() => this.loading = false);
  }

  async sendPaymentRequest(): Promise<void> {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched(); // Affiche les erreurs si le formulaire est invalide
      return;
    }
    this.loading = true;
    this.resetMessages(); // Réinitialise les messages de succès/erreur

    if (!this.preneurDetails?.telephone || !this.preneurDetails?.email || !this.preneurDetails?.id) {
      this.errorMessage = "Les détails du preneur (ID, téléphone, e-mail) sont incomplets.";
      this.loading = false;
      return;
    }

    const { sujet, montant, dateEcheance, remarques } = this.paymentForm.value;
    const sujetLabel = this.paymentSubjects.find(s => s.value === sujet)?.label || sujet;

    try {
      // 1. Créer la demande de paiement dans la base de données
      const newPaymentRequest = await this.paymentService.createPaymentRequest({
        quote_id: this.quoteId!,
        quote_type: this.quoteType!,
    
        montant: montant,
        sujet: sujetLabel,
        remarques: remarques,
        date_echeance: dateEcheance,
        uid_user: this.currentUserUid ?? undefined
      });

      // Génération de la facture via Storecove (appel asynchrone à l'Edge Function)
      const invoiceData = {
        paymentRequestId: newPaymentRequest.id,
        customer: {
          id: this.preneurDetails.id,
          name: `${this.preneurDetails.prenom} ${this.preneurDetails.nom}`,
          email: this.preneurDetails.email,
          address: this.preneurDetails.adresse,
          postalCode: this.preneurDetails.code_postal,
          city: this.preneurDetails.ville
        },
        invoiceDetails: {
          amount: montant,
          description: sujetLabel,
          dueDate: dateEcheance
        }
      };
      
      this.storecoveService.createInvoice(invoiceData).subscribe({
        next: (res) => console.log('Facture Storecove initiée:', res),
        error: (err) => {
          console.error('Erreur création facture Storecove:', err);
          this.warningMessage = "La demande est envoyée, mais la facture n'a pas pu être générée automatiquement (API indisponible).";
        }
      });

      // 2. Construire les liens de paiement avec le nouvel UID
      const paymentLink = `${environment.stripe_lien_paiement}/paiement/${newPaymentRequest.uid}`;
      const shortPaymentLink = `${environment.stripe_lien_paiement}/p/${newPaymentRequest.uid}`; // Pour le SMS

      // 3. Construire le contenu des messages
      let smsMessage = `Paiement requis: ${montant}€ pour "${sujetLabel}" (devis ${this.quoteId}). Échéance: ${new Date(dateEcheance).toLocaleDateString('fr-BE')}. Payer: ${paymentLink}`;
      if (smsMessage.length > 160) {
        smsMessage = `Paiement requis: ${montant}€ pour "${sujetLabel}" (devis ${this.quoteId}). Échéance: ${new Date(dateEcheance).toLocaleDateString('fr-BE')}. Payer: ${shortPaymentLink}`;
      }

      const emailSubject = `Demande de paiement pour votre devis N°${this.quoteId}`;
      const emailHtmlContent = `
        <p>Bonjour ${this.preneurDetails.prenom || ''},</p>
        <p>Une demande de paiement de <strong>${montant}€</strong> a été émise pour votre devis N°${this.quoteId}.</p>
        <ul>
          <li><strong>Sujet :</strong> ${sujetLabel}</li>
          <li><strong>Montant :</strong> ${montant}€</li>
          <li><strong>Date d'échéance :</strong> ${new Date(dateEcheance).toLocaleDateString('fr-BE')}</li>
        </ul>
        ${remarques ? `<p><strong>Remarques :</strong> ${remarques}</p>` : ''}
        <p>Vous pouvez effectuer le paiement en cliquant sur le lien ci-dessous :</p>
        <p><a href="${paymentLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Payer maintenant</a></p>
        <p>Cordialement,<br>L'équipe assurkin</p>
      `;
      const emailData: EmailData = { to: this.preneurDetails.email, subject: emailSubject, htmlContent: emailHtmlContent };

      // 4. Envoyer les communications et sauvegarder leur statut
      await Promise.all([
        this.smsService.sendSms(this.preneurDetails.telephone, smsMessage).then(() =>
          this.saveMessageToDb('sms', 'sent', { recipient: this.preneurDetails!.telephone!, content: smsMessage, subject: `Demande de paiement: ${sujetLabel}` })
        ),
        this.mailService.sendEmail(emailData).toPromise().then(() =>
          this.saveMessageToDb('email', 'sent', { recipient: emailData.to, subject: emailData.subject, content: emailData.htmlContent })
        )
      ]);

      this.successMessage = 'La demande de paiement a été créée et envoyée avec succès par SMS et e-mail.';
      this.paymentForm.reset();
      this.paymentForm.get('sujet')?.setValue('');
      this.loadPayments();

    } catch (error: any) {
      console.error("Erreur lors du processus de demande de paiement:", error);
      this.errorMessage = error.message || "Une erreur est survenue lors de la création ou de l'envoi de la demande de paiement.";
    } finally {
      this.loading = false;
    }
  }

  saveCommission(): void {
    if (this.commissionForm.invalid) {
      this.commissionForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.resetMessages();

    const commissionData: Commission = {
      quote_id: this.quoteId!,
      quote_type: this.quoteType!,
      categorie: this.commissionForm.value.categorie,
      montant: this.commissionForm.value.montant,
      date_echeance: this.commissionForm.value.dateEcheance,
      date_paiement: this.commissionForm.value.datePaiement || null,
      compagnie: this.commissionForm.value.compagnie
    };

    this.dbService.saveCommission(commissionData).subscribe({
      next: () => {
        this.successMessage = 'Commission enregistrée avec succès.';
        this.commissionForm.reset();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors de l\'enregistrement de la commission:', err);
        this.errorMessage = "Une erreur est survenue lors de l'enregistrement de la commission.";
        this.loading = false;
      }
    });
  }

  loadPayments(): void {
    if (!this.quoteId || !this.quoteType) return;

    this.paymentService.getPaymentRequestsByQuote(this.quoteId, this.quoteType)
      .subscribe({
        next: (data: any[]) => this.payments = data,
        error: (err: any) => console.error('Erreur chargement paiements', err)
      });
  }

  downloadInvoice(payment: any): void {
    if (!payment.storecove_invoice_id) return;
    
    this.loading = true;
    this.storecoveService.downloadInvoice(payment.storecove_invoice_id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `facture_${payment.storecove_invoice_id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur téléchargement facture', err);
        this.errorMessage = "Impossible de télécharger la facture.";
        this.loading = false;
      }
    });
  }

  retryInvoice(payment: any): void {
    if (!this.preneurDetails) {
      this.errorMessage = "Impossible de réessayer la facture : détails du preneur manquants.";
      return;
    }

    this.loading = true;
    this.resetMessages();

    const invoiceData = {
      paymentRequestId: payment.id,
      customer: {
        id: this.preneurDetails.id,
        name: `${this.preneurDetails.prenom} ${this.preneurDetails.nom}`,
        email: this.preneurDetails.email,
        address: this.preneurDetails.adresse,
        postalCode: this.preneurDetails.code_postal,
        city: this.preneurDetails.ville
      },
      invoiceDetails: {
        amount: payment.montant,
        description: payment.sujet,
        dueDate: payment.date_echeance
      }
    };

    this.storecoveService.createInvoice(invoiceData).subscribe({
      next: (res) => {
        console.log('Facture Storecove régénérée:', res);
        this.successMessage = "La facture a été générée avec succès.";
        this.loadPayments();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur régénération facture Storecove:', err);
        this.warningMessage = "Échec de la régénération de la facture. Veuillez vérifier les logs.";
        this.loading = false;
      }
    });
  }

  private async saveMessageToDb(
    type: 'sms' | 'email', 
    status: 'sent' | 'failed', 
    data: { 
      recipient: string, 
      content: string, 
      subject?: string, 
      error?: string 
    }
  ) {
    if (!this.quoteType || !this.quoteId) {
      console.error('Impossible de sauvegarder le message : informations sur le devis manquantes.');
      return;
    }

    const messageRecord = {
      categorie: this.quoteType,
      categorie_id: this.quoteId,
      type,
      status,
      ...data
    };
    await this.dbService.saveMessage(messageRecord);
  }

  private resetMessages(): void {
    this.successMessage = null;
    this.warningMessage = null;
    this.errorMessage = null;
  }

  // Validateur personnalisé pour s'assurer que la date est dans le futur
  private futureDateValidator(control: AbstractControl): { [s: string]: boolean } | null {
    if (control.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // On ne compare que la date, pas l'heure
      const selectedDate = new Date(control.value);
      if (selectedDate < today) {
        return { 'pastDate': true }; // La date est dans le passé
      }
    }
    return null; // La date est valide
  }
}
