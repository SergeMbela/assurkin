import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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

export interface ExistingFile {
  path: string;
  file_name: string;
  raisons: string;
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
   * Convertit le type de devis (string) en son ID numérique correspondant.
   * @param quoteType Le type de devis sous forme de chaîne (ex: 'auto').
   * @returns L'ID numérique correspondant.
   */
  private getQuoteTypeId(quoteType: string): number {
    const typeMap: { [key: string]: number } = {
      'auto': 1,
      'habitation': 2,
      'obseques': 3,
      'rc': 4,
      'voyage': 5,
      // Ajoutez d'autres types si nécessaire
    };
    return typeMap[quoteType.toLowerCase()] || 0; // Retourne 0 si non trouvé
  }

  /**
   * Récupère les chemins des documents pour un contrat spécifique.
   * @param quoteId L'ID du devis.
   * @param quoteType Le type de devis.
   * @returns Un Observable avec un tableau des chemins de documents.
   */
  getContractFiles(quoteId: number, quoteType: string): Observable<ExistingFile[]> {
    return from(
      this.supabase.supabase
        .from('uploaded_files')
        .select('path, file_name, raisons,date_created')
        .eq('id_quote', quoteId)
        .eq('id_type', this.getQuoteTypeId(quoteType))
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des fichiers:', response.error);
          return [];
        }
        return (response.data as ExistingFile[]) || [];
      })
    );
  }

  /**
   * Insère une référence de fichier dans la table 'uploaded_files'.
   * @param quoteId L'ID du devis.
   * @param quoteType Le type de devis (ex: 'auto').
   * @param filePath Le chemin du fichier stocké dans Supabase Storage.
   * @param fileName Le nom original du fichier.
   * @param raison La raison du téléversement (sujet du contrat).
   * @param preneurId L'ID du preneur d'assurance.
   * @returns Un Observable qui se complète lorsque l'opération est terminée.
   */
  addContractFile(quoteId: number, quoteType: string, filePath: string, fileName: string, raison: string, preneurId: number): Observable<void> {
    const newFilePayload = {
      id_quote: quoteId,
      id_type: this.getQuoteTypeId(quoteType),
      user_id: preneurId, // Enregistrement de l'ID du preneur
      path: filePath,
      file_name: fileName,
      raisons: raison, // Ajout de la raison
    };

    return from(this.supabase.supabase.from('uploaded_files').insert(newFilePayload)).pipe(
      map(finalResponse => {
        if (finalResponse && finalResponse.error) {
          console.error("Erreur lors de l'insertion de la référence du fichier:", finalResponse.error);
          throw finalResponse.error;
        }
      })
    );
  }
}