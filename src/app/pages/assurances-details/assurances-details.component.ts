import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of, startWith } from 'rxjs';
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
  private router = inject(Router);
  private dbConnectService = inject(DbConnectService);

  devisState$!: Observable<DataState<any>>;

  ngOnInit(): void {
    console.log('[AssurancesDetailsComponent] ngOnInit started.');
    const params = this.route.snapshot.paramMap;
    const devisId = Number(params.get('id'));
    const devisType = params.get('type'); // On récupère le type depuis l'URL

    console.log(`[AssurancesDetailsComponent] Retrieved devisId: ${devisId}, devisType from URL: ${devisType}`);

    if (isNaN(devisId) || !devisType) {
      const errorMessage = `ID de devis (${devisId}) ou type (${devisType}) invalide.`;
      console.error(`[AssurancesDetailsComponent] Erreur: ${errorMessage}`);
      this.devisState$ = of({ loading: false, error: errorMessage });
      return;
    }

    // On crée un observable pour le type de devis.
    // Puisque le type est maintenant dans l'URL, on l'utilise directement.
    // La logique de fallback vers getQuoteCategoryById n'est plus nécessaire si toutes les routes sont mises à jour.
    const type$ = devisType
      ? (console.log(`[AssurancesDetailsComponent] Using devisType '${devisType}' from URL.`), of(devisType))
      // Fallback au cas où une ancienne URL sans type serait utilisée.
      // Idéalement, cette branche ne devrait plus être atteinte.
      : (console.log('[AssurancesDetailsComponent] DevisType not in URL, fetching from DB.'), this.dbConnectService.getQuoteCategoryById(devisId));

    this.devisState$ = type$.pipe(
      switchMap(type => {
        console.log(`[AssurancesDetailsComponent] Resolved devisType: ${type}`);
        if (!type) {
          // Si aucun type n'est trouvé, on déclenche une erreur.
          const errorMessage = "Type de devis introuvable pour l'ID " + devisId;
          console.error(`[AssurancesDetailsComponent] Erreur: ${errorMessage}`);
          throw new Error(errorMessage);
        }
        console.log(`[AssurancesDetailsComponent] Fetching quote details for type: ${type}, ID: ${devisId}`);
        return this.dbConnectService.getQuoteDetails(type, devisId);
      }),
      catchError(error => {
        console.error("[AssurancesDetailsComponent] Erreur lors de la récupération des détails du devis ou de la détermination du type.", error);
        return of({ loading: false, error: error });
      }),
      startWith({ loading: true }) // On commence toujours par un état de chargement
    );

    // On transforme le résultat pour qu'il corresponde à la structure DataState
    this.devisState$ = this.devisState$.pipe(
      map(data => {
        console.log('[AssurancesDetailsComponent] Devis data loaded successfully:', data);
        return { loading: false, data: data };
      }),
      catchError(error => { console.error('[AssurancesDetailsComponent] Final error in devisState$ pipe:', error); return of({ loading: false, error: error }); })
    );
  }
}
