import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { from, Observable } from 'rxjs';
import { map, single } from 'rxjs/operators';

export interface ContractPayload {
  quote_id: number;
  quote_type: string;
  compagnie_id: number;
  date_contrat: string;
  periodicite: string;
  rappel: boolean;
  document_paths: string[];
  uid: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private supabase = inject(SupabaseService);

  /**
   * Insère un nouveau contrat dans la table 'contrats'.
   * @param payload Les données du contrat à insérer.
   * @returns Un Observable avec les données du contrat inséré.
   */
  saveContractData(payload: ContractPayload): Observable<any> {
    console.log('Envoi des données du contrat à Supabase:', payload);
    return from(this.supabase.supabase.from('contrats').insert([payload]).select().single());
  }

  /**
   * Récupère les chemins des documents pour un contrat spécifique.
   * @param quoteId L'ID du devis.
   * @param quoteType Le type de devis.
   * @returns Un Observable avec un tableau des chemins de documents.
   */
  getContractFiles(quoteId: number, quoteType: string): Observable<string[]> {
    return from(
      this.supabase.supabase
        .from('contrats')
        .select('document_paths')
        .eq('quote_id', quoteId)
        .eq('quote_type', quoteType)
        .limit(1)
        .maybeSingle() // Utiliser maybeSingle() pour gérer le cas où aucun contrat n'existe encore.
    ).pipe(
      map(response => response.data?.document_paths || [])
    );
  }
}