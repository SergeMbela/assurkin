import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, EMPTY, of } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResult {
  fileName: string;
  status: 'success' | 'error';
  path?: string;
  error?: string;
}
@Injectable({
  providedIn: 'root'
})
export class UploaderService {
  private http = inject(HttpClient);
  private supabaseUrl = environment.supabaseUrl;
  private supabaseKey = environment.supabaseKey;

  /**
   * Détermine le nom du bucket Supabase en fonction du type de devis.
   * @param quoteType Le type de devis (ex: 'auto', 'habitation').
   * @returns Le nom du bucket correspondant.
   */
  private getBucketName(quoteType: string): string {
    const bucketMap: { [key: string]: string } = {
      'auto': 'documents_auto', // Le nom du bucket pour l'assurance auto
      'habitation': 'documents_habitation',
      'obseques': 'documents_obseques',
      'rc': 'documents_rc',
      'voyage': 'documents_voyage',
      // Ajoutez d'autres types ici au besoin
    };
    return bucketMap[quoteType] || 'documents_autres'; // Un bucket par défaut
  }

  /**
   * Téléverse les fichiers de contrat vers le bucket Supabase approprié.
   * @param files Les fichiers à téléverser.
   * @param quoteId L'ID du devis, utilisé pour créer un sous-dossier.
   * @param quoteType Le type de devis, utilisé pour déterminer le bucket.
   * @returns Un Observable qui émet un tableau des chemins des fichiers téléversés.
   */
  uploadContractFiles(files: File[], quoteId: number, quoteType: string): Observable<UploadResult> {
    if (!files || files.length === 0) {
      return EMPTY; // Retourne un observable qui se termine immédiatement
    }

    const bucketName = this.getBucketName(quoteType);

    // Utilise mergeMap pour traiter chaque fichier et émettre son résultat individuellement
    return from(files).pipe(
      mergeMap((file) => {
        // Le chemin est maintenant construit côté serveur, mais nous envoyons les infos nécessaires.
        const formData = new FormData();
        formData.append('file', file);
        formData.append('quoteId', String(quoteId));
        formData.append('quoteType', quoteType);

        const url = `${this.supabaseUrl}/functions/v1/storage-upload`;

        // Utilise HttpClient pour envoyer le FormData. C'est la méthode standard pour le téléversement de fichiers.
        return this.http.post<any>(url, formData, {
            headers: {
              // L'en-tête 'apikey' est utilisé pour l'authentification avec les fonctions Supabase.
              'apikey': this.supabaseKey,
            },
          })
          .pipe(
            map((response) => {
            // La fonction renvoie un objet avec une propriété `path` en cas de succès.
            return { fileName: file.name, status: 'success' as const, path: response.path };
          }),
          catchError(err => {
            // Gérer les erreurs réseau ou autres erreurs inattendues de l'appel de la fonction
            const errorMessage = err.error?.error || err.message || 'Erreur réseau';
            return of({ fileName: file.name, status: 'error' as const, error: errorMessage });
          })
        );
      })
    );
  }
}
