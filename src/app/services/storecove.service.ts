import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorecoveService {

  // URL de base pour les Edge Functions Supabase
  private functionsUrl = `${environment.supabaseUrl}/functions/v1`;

  constructor(
    private http: HttpClient,
    private supabase: SupabaseService
  ) { }

  /**
   * Méthode générique pour appeler une Edge Function sécurisée.
   * @param functionName Le nom de la fonction déployée sur Supabase.
   * @param body Le corps de la requête (payload JSON).
   */
  private callFunction<T>(functionName: string, body: any): Observable<T> {
    return from(this.supabase.supabase.auth.getSession()).pipe(
      switchMap(sessionResponse => {
        const session = sessionResponse.data.session;
        if (!session) {
          return throwError(() => new Error('Utilisateur non authentifié. Impossible d\'appeler Storecove.'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        });

        return this.http.post<T>(`${this.functionsUrl}/${functionName}`, body, { headers });
      })
    );
  }

  /**
   * Déclenche la création d'une facture via l'Edge Function 'generate-invoice'.
   * @param invoiceData Les données nécessaires pour la facture (client, lignes, montants, etc.).
   */
  createInvoice(invoiceData: any): Observable<any> {
    // On appelle la fonction 'generate-invoice' que nous allons créer côté Supabase
    return this.callFunction('generate-invoice', invoiceData);
  }

  /**
   * Télécharge la facture PDF via l'Edge Function 'get-invoice-document'.
   * @param invoiceId L'ID de la facture Storecove.
   */
  downloadInvoice(invoiceId: string): Observable<Blob> {
    return from(this.supabase.supabase.auth.getSession()).pipe(
      switchMap(sessionResponse => {
        const session = sessionResponse.data.session;
        if (!session) {
          return throwError(() => new Error('Utilisateur non authentifié.'));
        }
        
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        });

        return this.http.post(`${this.functionsUrl}/get-invoice-document`, { invoiceId }, { 
          headers,
          responseType: 'blob'
        });
      })
    );
  }
}