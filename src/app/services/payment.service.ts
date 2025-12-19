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
  preneur_uid?: number;
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
  payment_intent_id?: string | null;
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

  // Inside payment.service.ts

  createPaymentIntent(amount: number, metadata: any = {}): Observable<PaymentIntent> {
    return from(this.supabase.supabase.auth.getSession()).pipe(
      switchMap(sessionResponse => {
        const session = sessionResponse.data.session;
        if (!session) return throwError(() => new Error('Not authenticated'));

        const headers = new HttpHeaders().set('Authorization', `Bearer ${session.access_token}`);

        // We pass amount and metadata to the Edge Function
        return this.http.post<PaymentIntent>(this.apiUrl, { amount, metadata }, { headers });
      })
    );
  }

  /**
   * Crée une nouvelle demande de paiement dans la base de données.
   * @param payload Les données de la demande de paiement à créer.
   * @returns Une promesse qui se résout avec l'enregistrement de la demande de paiement.
   */
  async createPaymentRequest(payload: PaymentRequestPayload): Promise<PaymentRequest> {
    const { data, error } = await this.supabase.supabase
      .from('payment_requests')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentRequest;
  }

  /**
   * Récupère les demandes de paiement liées à un preneur (client).
   * @param preneurId L'ID du preneur (table personnes).
   * @returns Un Observable avec la liste des demandes de paiement.
   */
  getPaymentRequestsByPreneur(preneurId: number): Observable<PaymentRequest[]> {
    return from(this.supabase.supabase
      .from('payment_requests')
      .select('*')
      .eq('preneur_uid', preneurId)
      .order('created_at', { ascending: false })
    ).pipe(map(response => response.data as PaymentRequest[] || []));
  }

  /**
   * Récupère les demandes de paiement associées à un utilisateur spécifique via son UID (uid_user).
   * @param userId L'UID de l'utilisateur (Supabase Auth ID).
   * @returns Un Observable avec la liste des demandes de paiement.
   */
  getPaymentRequestsByUser(userId: string): Observable<PaymentRequest[]> {
    return from(this.supabase.supabase
      .from('payment_requests')
      .select('*')
      .eq('uid_user', userId)
      .order('created_at', { ascending: false })
    ).pipe(map(response => response.data as PaymentRequest[] || []));
  }

  /**
   * Récupère les détails (email, nom, prénom) d'une personne par son ID.
   * @param id L'ID de la personne.
   */
  async getPersonDetails(id: number): Promise<{ email: string, prenom: string, nom: string } | null> {
    const { data, error } = await this.supabase.supabase
      .from('personnes')
      .select('email, prenom, nom')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération des détails de la personne:', error);
      return null;
    }
    return data;
  }
}