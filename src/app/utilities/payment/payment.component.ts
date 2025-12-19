import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService, PaymentRequest } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { MailService } from '../../services/mail.service';
import { switchMap } from 'rxjs/operators';
import { of, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
})
export class PaymentComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private mailService = inject(MailService);

  payments: PaymentRequest[] = [];
  loading = true;
  errorMessage: string | null = null;
  sendingEmailId: number | null = null;

  ngOnInit() {
    this.authService.currentUser$.pipe(
      switchMap(user => {
        if (user) {
          return this.paymentService.getPaymentRequestsByUser(user.id);
        } else {
          return of([]);
        }
      })
    ).subscribe({
      next: (data) => {
        this.payments = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement historique paiements', err);
        this.errorMessage = 'Impossible de charger l\'historique des paiements.';
        this.loading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
     switch (status) {
      case 'pending': return 'En attente';
      case 'paid': return 'Payé';
      case 'failed': return 'Échoué';
      case 'cancelled': return 'Annulé';
      case 'overdue': return 'En retard';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  async resendReminder(payment: PaymentRequest) {
    if (!payment.preneur_uid) {
      alert("Impossible de relancer : aucun client associé à ce paiement.");
      return;
    }

    if (!confirm("Voulez-vous envoyer un rappel de paiement par e-mail au client ?")) {
      return;
    }

    this.sendingEmailId = payment.id;

    try {
      const person = await this.paymentService.getPersonDetails(payment.preneur_uid);
      
      if (!person || !person.email) {
        alert("Impossible de récupérer l'email du client.");
        return;
      }

      const emailContent = `
        <p>Bonjour ${person.prenom} ${person.nom},</p>
        <p>Sauf erreur de notre part, nous sommes toujours dans l'attente du règlement concernant votre dossier ${payment.quote_type} #${payment.quote_id}.</p>
        <p><strong>Objet :</strong> ${payment.sujet}</p>
        <p><strong>Montant à régler :</strong> ${payment.montant} €</p>
        <p><strong>Date limite :</strong> ${new Date(payment.date_echeance).toLocaleDateString()}</p>
        <p>Merci de régulariser votre situation dans les plus brefs délais via votre espace client.</p>
        <p>Cordialement,<br>L'équipe Assurkin</p>
      `;

      await lastValueFrom(this.mailService.sendEmail({
        to: person.email,
        subject: `Rappel : Paiement en attente - Dossier #${payment.quote_id}`,
        htmlContent: emailContent
      }));

      alert("Rappel envoyé avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'envoi du rappel:", err);
      alert("Une erreur est survenue lors de l'envoi du rappel.");
    } finally {
      this.sendingEmailId = null;
    }
  }
}