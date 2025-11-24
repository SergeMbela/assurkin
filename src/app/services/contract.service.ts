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
    return from(this.supabase.supabase.from('contrats').insert([payload]).select().single());
  }
}