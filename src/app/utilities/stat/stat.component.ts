import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DbConnectService, Commission } from '../../services/db-connect.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartData, ChartType } from 'chart.js';


@Component({
  selector: 'app-stat',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BaseChartDirective],
  templateUrl: './stat.component.html',
  styleUrls: ['./stat.component.css']
})
export class StatComponent implements OnInit {
  activeTab: string = 'automobile'; // Onglet par défaut
  private dbService = inject(DbConnectService);

  commissions$: Observable<Commission[]> = of([]);
  commissionTotals: { [key: string]: number } = {};
  categoryLabels: { [key: string]: string } = {
    'commission_bancaire': 'Commissions Bancaires',
    'frais_dossier': 'Frais de Dossier',
    'commission_assurance': "Commissions d'Assurance"
  };
  
  // Données pour le graphique et le tableau
  monthlyStats: { month: string, total: number, count: number }[] = [];
  tableData: Commission[] = [];
  paginatedTableData: Commission[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  allCommissions: Commission[] = []; // Stocke toutes les commissions récupérées
  totalCommission = 0;
  loading = true;
  error: string | null = null;

  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  // Configuration ng2-charts / Chart.js
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumSignificantDigits: 3 }).format(Number(value));
          }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Commissions' }]
  };

  constructor() {
    Chart.register(...registerables);
    registerLocaleData(localeFr);
  }

  ngOnInit(): void {
    
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.availableYears.push(currentYear - i);
    }
    this.setActiveTab(this.activeTab);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    let quoteType: string | undefined;

    // Mapping des onglets vers les types de devis en base de données
    switch (tab) {
      case 'automobile': quoteType = 'auto'; break;
      case 'habitation': quoteType = 'habitation'; break;
      case 'obseques': quoteType = 'obseques'; break;
      case 'voyage': quoteType = 'voyage'; break;
      case 'rc_familiale': quoteType = 'rc'; break;
      case 'solde_restant': quoteType = 'solde_restant'; break;
      case 'prospects': quoteType = undefined; break; // Tous les types
      default: quoteType = undefined;
    }

    this.loadCommissionStats(quoteType);
  }

  loadCommissionStats(quoteType?: string): void {
    this.loading = true;
    this.error = null;
    this.commissions$ = this.dbService.getAllCommissions(quoteType).pipe(
      catchError(err => {
        this.error = "Erreur lors du chargement des commissions.";
        console.error(err);
        this.loading = false;
        return of([]);
      })
    );

    this.commissions$.subscribe(commissions => {
      this.allCommissions = commissions.map(c => ({
        ...c,
        montant: Number(c.montant)
      }));
      this.filterDataByYear();
      this.loading = false;
    });
  }

  filterDataByYear(): void {
    const filtered = this.allCommissions.filter(c => {
      const d = new Date(c.date_echeance);
      return d.getFullYear() === Number(this.selectedYear);
    });
    
    // Tri des résultats par montant décroissant
    this.tableData = filtered.sort((a, b) => b.montant - a.montant);
    
    this.currentPage = 1;
    this.updatePaginatedTableData();
    
    this.calculateTotals(filtered);
    this.calculateMonthlyStats(filtered);
  }

  onYearChange(): void {
    this.filterDataByYear();
  }

  exportToCsv(): void {
    if (this.tableData.length === 0) return;

    const headers = ['Date Échéance', 'Catégorie', 'Compagnie', 'Montant', 'Statut'];
    const csvContent = [
      headers.join(','),
      ...this.tableData.map(item => {
        const row = [
          item.date_echeance,
          this.categoryLabels[item.categorie] || item.categorie,
          item.compagnie || '',
          item.montant,
          item.date_paiement ? 'Payé' : 'En attente'
        ];
        return row.map(field => {
          const str = String(field ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `commissions_${this.selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  updatePaginatedTableData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTableData = this.tableData.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePaginatedTableData();
  }

  getTotalPages(): number {
    return Math.ceil(this.tableData.length / this.itemsPerPage);
  }

  getPagesArray(): number[] {
    return Array(this.getTotalPages()).fill(0).map((x, i) => i + 1);
  }

  private calculateTotals(commissions: Commission[]): void {
    this.commissionTotals = {};
    this.totalCommission = 0;

    for (const commission of commissions) {
      const category = commission.categorie;
      const amount = Number(commission.montant) || 0;

      if (!this.commissionTotals[category]) {
        this.commissionTotals[category] = 0;
      }
      this.commissionTotals[category] += amount;
      this.totalCommission += amount;
    }
  }

  private calculateMonthlyStats(commissions: Commission[]): void {
    const statsMap = new Map<string, number>();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    // Initialiser les 12 mois de l'année sélectionnée
    months.forEach(m => statsMap.set(m, 0));

    // Remplir avec les données réelles
    for (const comm of commissions) {
      const date = new Date(comm.date_echeance);
      // Les données sont déjà filtrées par année, on prend juste le mois
      const monthName = months[date.getMonth()];
      statsMap.set(monthName, (statsMap.get(monthName) || 0) + Number(comm.montant));
    }

    this.monthlyStats = Array.from(statsMap.entries()).map(([month, total]) => ({
      month,
      total,
      count: 0
    }));

    // Mise à jour des données du graphique
    this.barChartData = {
      labels: this.monthlyStats.map(s => s.month),
      datasets: [
        {
          data: this.monthlyStats.map(s => s.total),
          label: 'Commissions',
          backgroundColor: '#c7d2fe', // Couleur indigo-200
          hoverBackgroundColor: '#818cf8', // Couleur indigo-400
          borderRadius: 4
        }
      ]
    };
  }

  // Aide pour itérer sur les clés de l'objet dans le template
  get commissionCategories(): string[] {
    return Object.keys(this.commissionTotals);
  }
}
