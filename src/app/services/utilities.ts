import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, startWith, debounceTime, switchMap, tap } from 'rxjs/operators';

// Définition des types basés sur votre schéma de base de données
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled'| 'overdue';

export interface PaymentRequest {
  id: number;
  uid: string;
  created_at: string;
  updated_at: string | null;
  quote_id: number;
  quote_type: string;
  preneur_uid: number | null;
  montant: number;
  sujet: string;
  remarques: string | null;
  date_echeance: string;
  statut: PaymentStatus;
  payment_link: string | null;
  paid_at: string | null;
  transaction_id: string | null;
  uid_user: string | null;
  client_name?: string; // Propriété à obtenir via une jointure
}

export interface PaginatedPaymentsResponse {
  data: PaymentRequest[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface PaymentViewModel {
  state: {
    data?: { payments: PaymentRequest[] };
    loading: boolean;
    error: any;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentComponent implements OnInit {
  private readonly ITEMS_PER_PAGE = 20;

  searchControl = new FormControl('');
  private page$ = new BehaviorSubject<number>(1);

  vm$!: Observable<PaymentViewModel>;

  ngOnInit(): void {
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      tap(() => this.page$.next(1))
    );

    this.vm$ = combineLatest([search$, this.page$]).pipe(
      switchMap(([searchTerm, page]) => this.fetchMockPayments(page, this.ITEMS_PER_PAGE, searchTerm || '')),
      map(response => ({
        state: { data: { payments: response.data }, loading: false, error: null },
        pagination: {
          currentPage: response.currentPage,
          totalPages: response.totalPages,
          totalItems: response.totalItems,
          itemsPerPage: this.ITEMS_PER_PAGE,
        },
      }))
    );
  }

  goToPage(page: number): void {
    this.page$.next(page);
  }

  getStatusClass(status: PaymentStatus): string {
    const classes: Record<PaymentStatus, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  translateStatus(status: PaymentStatus): string {
    const translations: Record<PaymentStatus, string> = {
      pending: 'En attente',
      paid: 'Payé',
      failed: 'Échoué',
      cancelled: 'Annulé',
    };
    return translations[status] || status;
  }

  private fetchMockPayments(page: number, limit: number, search: string): Observable<PaginatedPaymentsResponse> {
    const allPayments: PaymentRequest[] = Array.from({ length: 85 }, (_, i) => ({
      id: 12345 + i, uid: `uid-${12345 + i}`, created_at: new Date().toISOString(), updated_at: null,
      quote_id: 789 + i, quote_type: i % 2 === 0 ? 'auto' : 'habitation', preneur_uid: 101 + i,
      client_name: i % 3 === 0 ? 'Jean Dupont' : (i % 3 === 1 ? 'Marie Curie' : 'Albert Einstein'),
      montant: 125.50 + i * 10, sujet: `Paiement assurance ${i % 2 === 0 ? 'auto' : 'habitation'}`, remarques: null,
      date_echeance: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
      statut: i % 4 === 0 ? 'paid' : (i % 4 === 1 ? 'pending' : (i % 4 === 2 ? 'failed' : 'cancelled')),
      payment_link: `https://stripe.com/pay/link_${i}`, paid_at: i % 4 === 0 ? new Date().toISOString() : null,
      transaction_id: i % 4 === 0 ? `txn_${12345 + i}` : null, uid_user: null,
    }));

    const filtered = allPayments.filter(p =>
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toString().includes(search) ||
      p.montant.toString().includes(search) ||
      p.sujet.toLowerCase().includes(search.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    return of({ data: paginatedData, totalItems, totalPages, currentPage: page });
  }
}
