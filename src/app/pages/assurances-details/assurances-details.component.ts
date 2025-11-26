import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router'; // ParamMap might not be needed if we only get the ID
import { Observable, of, startWith, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DbConnectService } from '../../services/db-connect.service';
import { DataState } from '../../data-state.model';
import { StateContainerComponent } from '../../state-container.component';

@Component({
  selector: 'app-assurances-details',
  standalone: true,
  imports: [CommonModule, RouterLink, StateContainerComponent],
  templateUrl: './assurances-details.component.html',
  styleUrl: './assurances-details.component.css'
})
export class AssurancesDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dbConnectService = inject(DbConnectService);

  devisState$!: Observable<DataState<any>>;

  ngOnInit(): void {
    this.devisState$ = this.route.paramMap.pipe(
      switchMap(params => this.getDevisData(params)),
      map(data => {
        // La fonction RPC de Supabase peut retourner un tableau ou un objet.
        // On s'assure de récupérer l'objet devis dans les deux cas.
        const devisDetails = Array.isArray(data) ? data[0] : data;
        console.log('[AssurancesDetailsComponent] Données du devis reçues et extraites:', devisDetails);
        return { loading: false, data: devisDetails };
      }),
      startWith({ loading: true }),
      catchError(error => {
        console.error("[AssurancesDetailsComponent] Erreur dans le chargement des détails du devis:", error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
        return of({ loading: false, error: errorMessage });
      })
    );
  }

  /**
   * Récupère l'ID du devis depuis les paramètres de la route et appelle le service
   * pour obtenir toutes les données du devis via la fonction Supabase.
   */
  private getDevisData(params: ParamMap): Observable<any> {
    const devisId = Number(params.get('id'));
    if (isNaN(devisId)) {
      throw new Error(`ID de devis invalide.`);
    }

    console.log(`[AssurancesDetailsComponent] Calling Supabase function for devisId: ${devisId}`);
    // On appelle une seule méthode qui exécute la procédure stockée (RPC) sur Supabase
    return this.dbConnectService.getFullQuoteDetails(devisId);
  }
}
