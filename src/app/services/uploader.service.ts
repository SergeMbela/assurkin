import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, from, EMPTY, of, merge } from 'rxjs';
import { map, catchError, mergeMap, scan, filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResult {
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  path?: string;
  error?: string;
  progress?: number; // Progression individuelle du fichier
  totalProgress?: number; // Progression globale
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
  public getBucketName(quoteType: string): string {
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
    if (!files || files.length === 0) return EMPTY;
    
    const bucketName = this.getBucketName(quoteType);
    const totalFiles = files.length;
    const url = `${this.supabaseUrl}/functions/v1/storage-upload`;
    
    // Crée un observable pour chaque téléversement de fichier
    const uploadObservables = files.map(file => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('quoteId', String(quoteId));
        formData.append('quoteType', quoteType);
        
        return this.http.post<any>(url, formData, {
            headers: {
              'apikey': this.supabaseKey,
            },
            reportProgress: true, // Active le suivi de la progression
            observe: 'events' // Observe tous les types d'événements HTTP
          })
          .pipe(
            map((event: HttpEvent<any>): Partial<UploadResult> | null => {
              switch (event.type) {
                case HttpEventType.UploadProgress:
                  const progress = Math.round(100 * event.loaded / (event.total || 1));
                  return { fileName: file.name, status: 'uploading', progress: progress };
                case HttpEventType.Response:
                  return { fileName: file.name, status: 'success', path: event.body.path, progress: 100 };
                default:
                  return null; // Ignore les autres types d'événements
              }
            }),
            catchError(err => of({
              fileName: file.name,
              status: 'error' as const,
              error: err.error?.error || err.message || 'Erreur réseau',
              progress: 0
            }))
          );
    });

    // Fusionne tous les observables et calcule la progression globale
    return merge(...uploadObservables).pipe(
      filter((result): result is Partial<UploadResult> => result !== null), // Filtre les événements non pertinents
      // Utilise scan pour maintenir un état des progressions de chaque fichier
      scan(
        (acc: { progresses: Map<string, number>, lastResult: UploadResult | null }, result: Partial<UploadResult>) => {
          acc.progresses.set(result.fileName!, result.progress || 0);
          // Assure que le lastResult est un objet complet
          acc.lastResult = { ...acc.lastResult, ...result } as UploadResult;
          return acc;
        },
        { progresses: new Map<string, number>(), lastResult: null }
      ),
      // Calcule la progression totale et l'ajoute au résultat émis
      map(acc => {
        const totalProgress = Array.from(acc.progresses.values()).reduce((sum, p) => sum + p, 0) / totalFiles;
        return {
          ...acc.lastResult!,
          totalProgress: Math.round(totalProgress)
        };
      })
    );
  }

  /**
   * Construit l'URL de téléchargement public pour un fichier stocké dans Supabase Storage.
   * @param bucketName Le nom du bucket où le fichier est stocké.
   * @param filePath Le chemin du fichier dans le bucket.
   * @returns L'URL publique complète pour accéder au fichier.
   */
  getDownloadUrl(bucketName: string, filePath: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
  }
}
