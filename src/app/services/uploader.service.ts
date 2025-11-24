import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UploaderService {
  private supabase = inject(SupabaseService);

  /**
   * Détermine le nom du bucket Supabase en fonction du type de devis.
   * @param quoteType Le type de devis (ex: 'auto', 'habitation').
   * @returns Le nom du bucket correspondant.
   */
  private getBucketName(quoteType: string): string {
    const bucketMap: { [key: string]: string } = {
      'auto': 'documents_auto', // Le nom du bucket pour l'assurance auto
      'habitation': 'documents_habitation',
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
  uploadContractFiles(files: File[], quoteId: number, quoteType: string): Observable<string[]> {
    if (!files || files.length === 0) {
      return of([]); // Retourne un tableau vide si pas de fichiers
    }

    const bucketName = this.getBucketName(quoteType);

    // Crée un tableau d'observables, un pour chaque téléversement de fichier
    const uploadObservables = files.map(file => {
      const filePath = `${quoteId}/${file.name}`; // Ex: '9/9_auto_20231027_1.pdf'
      return from(this.supabase.supabase.storage.from(bucketName).upload(filePath, file)).pipe(
        map(response => {
          if (response.error) throw response.error;
          return response.data.path; // Retourne le chemin du fichier téléversé
        })
      );
    });

    // Exécute tous les téléversements en parallèle et attend qu'ils soient tous terminés
    return forkJoin(uploadObservables);
  }
}
