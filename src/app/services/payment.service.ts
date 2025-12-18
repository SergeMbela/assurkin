import { Injectable } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

// Interface for Stripe Payment Intent
export interface PaymentIntent {
  clientSecret: string;
}
 
// Statuts de paiement possibles
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'overdue';

// Charge utile pour la création d'une demande de paiement
export interface PaymentRequestPayload {
  quote_id: number;
  quote_type: string;
  montant: number;
  sujet: string;
  remarques?: string | null;
  date_echeance: string;
  uid_user?: string;
}

// Schéma complet de la table `payment_requests`
export interface PaymentRequest {
  id: number;
  uid: string;
  created_at: string;
  updated_at?: string | null;
  quote_id: number;
  quote_type: string;
  preneur_uid?: number | null;
  montant: number;
  sujet: string;
  remarques?: string | null;
  date_echeance: string;
  statut: PaymentStatus;
  payment_link?: string | null;
  paid_at?: string | null;
  transaction_id?: string | null;
  uid_user?: string | null;
  storecove_invoice_id?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  // Correct URL for invoking a Supabase Edge Function
  private apiUrl = `${environment.supabaseUrl}/functions/v1/create-payment-intent`;

  constructor(
    private supabase: SupabaseService,
    private http: HttpClient
  ) { }

  // Method for Stripe payment processing
  /**
   * Crée une intention de paiement Stripe en appelant la Supabase Edge Function de manière sécurisée.
   * Cette méthode récupère d'abord le jeton d'authentification de l'utilisateur actuel et l'inclut
   * dans l'en-tête de la requête pour autoriser l'appel à la fonction.
   * @param amount Le montant du paiement en centimes.
   * @param metadata Données supplémentaires à attacher à l'intention de paiement (ex: payment_request_id).
   * @returns Un Observable qui émet un objet contenant le `clientSecret` de Stripe.
   */
  createPaymentIntent(amount: number, metadata: any = {}): Observable<PaymentIntent> {
    // Utilise un stream RxJS pour gérer l'asynchronisme de la récupération de session.
    return from(this.supabase.supabase.auth.getSession()).pipe(
      switchMap(sessionResponse => {
        const session = sessionResponse.data.session;
        if (!session) {
          // Si aucune session n'est trouvée, on retourne une erreur.
          return throwError(() => new Error('Utilisateur non authentifié. Impossible de créer une intention de paiement.'));
        }
        // Crée les en-têtes HTTP avec le jeton d'authentification.
        const headers = new HttpHeaders().set('Authorization', `Bearer ${session.access_token}`);
        return this.http.post<PaymentIntent>(this.apiUrl, { amount, metadata }, { headers });
      })
    );
  }

  /**
   * Crée une nouvelle demande de paiement dans la base de données.
   * @param payload Les données de la demande de paiement à créer.
   * @returns Une promesse qui se résout avec l'enregistrement de la demande de paiement.
   */
  public async createPaymentRequest(payload: PaymentRequestPayload): Promise<PaymentRequest> {
    const { data, error } = await this.supabase.supabase
      .from('payment_requests')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la demande de paiement:', error);
      throw error;
    }
    return data;
  }

  /**
   * Récupère toutes les demandes de paiement créées par un utilisateur spécifique.
   * @param userId L'UID de l'utilisateur (colonne uid_user).
   * @returns Un Observable avec la liste des demandes de paiement.
   */
  getPaymentRequestsForUser(userId: string): Observable<PaymentRequest[]> {
    return from(this.supabase.supabase
      .from('payment_requests')
      .select('*')
      .eq('uid_user', userId)
      .order('created_at', { ascending: false })
    ).pipe(map(response => response.data as PaymentRequest[] || []));
  }

  /**
   * Récupère les demandes de paiement liées à un devis spécifique.
   * @param quoteId L'ID du devis.
   * @param quoteType Le type de devis.
   * @returns Un Observable avec la liste des demandes de paiement.
   */
  getPaymentRequestsByQuote(quoteId: number, quoteType: string): Observable<PaymentRequest[]> {
    return from(this.supabase.supabase
      .from('payment_requests')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('quote_type', quoteType)
      .order('created_at', { ascending: false })
    ).pipe(map(response => response.data as PaymentRequest[] || []));
  }

  /**
   * Met à jour une demande de paiement existante, typiquement pour changer son statut.
   * @param id L'ID de la demande de paiement à mettre à jour.
   * @param updates Un objet contenant les champs à modifier (ex: statut, paid_at, transaction_id).
   * @returns Un Observable qui se résout avec l'enregistrement mis à jour.
   */
  updatePaymentRequestStatus(id: number, updates: Partial<PaymentRequest>): Observable<PaymentRequest> {
    return from(
      this.supabase.supabase
        .from('payment_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }
}