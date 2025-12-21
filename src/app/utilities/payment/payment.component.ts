import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PaymentService, PaymentRequest } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { MailService } from '../../services/mail.service';
import { switchMap } from 'rxjs/operators';
import { of, lastValueFrom } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartData, ChartType, ChartEvent } from 'chart.js';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BaseChartDirective],
  templateUrl: './payment.component.html',
})
export class PaymentComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private mailService = inject(MailService);

  payments: PaymentRequest[] = [];
  filteredPayments: PaymentRequest[] = [];
  loading = true;
  errorMessage: string | null = null;
  sendingEmailId: number | null = null;
  
  paginatedPayments: PaymentRequest[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 15;
  searchTerm: string = '';
  activeTab: 'history' | 'chart' = 'history';
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  showConfirmModal: boolean = false;
  paymentToRemind: PaymentRequest | null = null;

  // Configuration des graphiques
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    }
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  public pieChartType: ChartType = 'pie';

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: { 
      x: { stacked: true },
      y: { 
        stacked: true, 
        beginAtZero: true,
        title: {
          display: true,
          text: 'Montant (€)'
        }
      }
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          footer: (tooltipItems: any) => {
            let sum = 0;
            const dataIndex = tooltipItems[0].dataIndex;
            const chart = tooltipItems[0].chart;
            chart.data.datasets.forEach((dataset: any) => {
              const val = Number(dataset.data[dataIndex]);
              if (!isNaN(val)) sum += val;
            });
            return 'Total: ' + sum.toFixed(2) + ' €';
          }
        }
      }
    }
  };
  public barChartType: ChartType = 'bar';

  constructor() {
    Chart.register(...registerables);
  }

  get totalPaid(): number {
    return this.filteredPayments
      .filter(p => p.statut === 'paid')
      .reduce((acc, p) => acc + Number(p.montant), 0);
  }

  get totalPending(): number {
    return this.filteredPayments
      .filter(p => p.statut === 'pending')
      .reduce((acc, p) => acc + Number(p.montant), 0);
  }

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.availableYears.push(currentYear - i);
    }

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
        this.filteredPayments = data;
        this.loading = false;
        this.currentPage = 1;
        this.updatePaginatedPayments();
        this.updateCharts();
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

  resendReminder(payment: PaymentRequest) {
    if (!payment.preneur_uid) {
      alert("Impossible de relancer : aucun client associé à ce paiement.");
      return;
    }
    this.paymentToRemind = payment;
    this.showConfirmModal = true;
  }

  async confirmResend() {
    if (!this.paymentToRemind) return;
    
    const payment = this.paymentToRemind;
    if (!payment.preneur_uid) {
      return;
    }

    this.closeConfirmModal();
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

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.paymentToRemind = null;
  }

  onSearchChange(searchValue: string) {
    this.searchTerm = searchValue;
    this.currentPage = 1;

    if (!this.searchTerm) {
      this.filteredPayments = this.payments;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredPayments = this.payments.filter(p => 
        p.sujet.toLowerCase().includes(term) || 
        p.montant.toString().includes(term) ||
        (p.quote_type + ' #' + p.quote_id).toLowerCase().includes(term) ||
        p.created_at.toLowerCase().includes(term)
      );
    }
    this.updatePaginatedPayments();
    this.updateCharts();
  }

  clearFilter() {
    this.onSearchChange('');
  }

  updatePaginatedPayments() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedPayments = this.filteredPayments.slice(startIndex, endIndex);
  }

  onYearChange() {
    this.updateCharts();
  }

  onPieChartClick({ event, active }: { event?: ChartEvent, active?: object[] }): void {
    if (active && active.length > 0) {
      const chartElement: any = active[0];
      const index = chartElement.index;
      const label = this.pieChartData.labels?.[index];

      if (label) {
        this.onSearchChange(String(label));
        this.activeTab = 'history';
      }
    }
  }

  onBarChartClick({ event, active }: { event?: ChartEvent, active?: object[] }): void {
    if (active && active.length > 0) {
      const chartElement: any = active[0];
      const index = chartElement.index;
      const label = this.barChartData.labels?.[index];

      if (label) {
        this.onSearchChange(String(label));
        this.activeTab = 'history';
      }
    }
  }

  updateCharts() {
    if (!this.payments) return;

    const chartData = this.payments.filter(p => {
      const d = new Date(p.created_at);
      return d.getFullYear() === Number(this.selectedYear);
    });

    // Graphique Pie (Par Sujet)
    const subjectStats = new Map<string, number>();
    chartData.forEach(p => {
      const subject = p.sujet ? p.sujet.trim() : 'Autre';
      const current = subjectStats.get(subject) || 0;
      subjectStats.set(subject, current + Number(p.montant));
    });

    this.pieChartData = {
      labels: Array.from(subjectStats.keys()),
      datasets: [{
        data: Array.from(subjectStats.values()),
        backgroundColor: ['#60A5FA', '#34D399', '#F87171', '#FBBF24', '#A78BFA', '#EC4899', '#9CA3AF'],
      }]
    };

    // Graphique Bar (Évolution mensuelle)
    const monthlyStats = new Map<string, { paid: number, unpaid: number }>();
    
    // Tri par date de création
    const sorted = [...chartData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sorted.forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyStats.has(key)) {
        monthlyStats.set(key, { paid: 0, unpaid: 0 });
      }
      
      const stats = monthlyStats.get(key)!;
      if (p.statut === 'paid') {
        stats.paid += Number(p.montant);
      } else if (['pending', 'overdue', 'failed'].includes(p.statut)) {
        stats.unpaid += Number(p.montant);
      }
    });

    this.barChartData = {
      labels: Array.from(monthlyStats.keys()),
      datasets: [
        { data: Array.from(monthlyStats.values()).map(v => v.paid), label: 'Payé', backgroundColor: '#4ade80' },
        { data: Array.from(monthlyStats.values()).map(v => v.unpaid), label: 'Non Payé', backgroundColor: '#f87171' }
      ]
    };
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePaginatedPayments();
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredPayments.length / this.itemsPerPage);
  }

  getPagesArray(): number[] {
    return Array(this.getTotalPages()).fill(0).map((x, i) => i + 1);
  }

  exportToCsv() {
    const data = this.filteredPayments;
    if (data.length === 0) return;

    const headers = ['Date', 'Sujet', 'Montant', 'Statut', 'Type Dossier', 'ID Dossier'];
    const csvContent = [
      headers.join(';'),
      ...data.map(p => [
        new Date(p.created_at).toLocaleDateString('fr-FR'),
        `"${(p.sujet || '').replace(/"/g, '""')}"`,
        p.montant.toString().replace('.', ','),
        p.statut,
        p.quote_type,
        p.quote_id
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `paiements_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}