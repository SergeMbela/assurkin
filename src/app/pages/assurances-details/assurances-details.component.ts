import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { DbConnectService } from '../../services/db-connect.service';

@Component({
  selector: 'app-assurances-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './assurances-details.component.html',
  styleUrl: './assurances-details.component.css'
})
export class AssurancesDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dbConnectService = inject(DbConnectService);

  devisDetails$!: Observable<any>;
  loadingError = false;

  ngOnInit(): void {
    const devisId = Number(this.route.snapshot.paramMap.get('id'));
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const devisType = navigationState ? navigationState['type'] : null;
    
    if (isNaN(devisId)) {
      console.error("ID de devis invalide.");
      this.loadingError = true;
      this.devisDetails$ = of(null);
      return;
    }

    // On crée un observable pour le type de devis.
    const type$ = devisType 
      ? of(devisType) // Si le type est dans le state, on l'utilise directement.
      : this.dbConnectService.getQuoteCategoryById(devisId); // Sinon, on le cherche en base de données.

    this.devisDetails$ = type$.pipe(
      switchMap(type => {
        if (!type) {
          // Si aucun type n'est trouvé, on déclenche une erreur.
          throw new Error("Type de devis introuvable pour l'ID " + devisId);
        }
        return this.getDetailsObservable(type, devisId);
      }),
      catchError(error => {
        console.error("ID de devis invalide ou type de devis manquant dans la navigation.", error);
        this.loadingError = true;
        return of(null);
      })
    );
  }

  private getDetailsObservable(type: string, id: number): Observable<any> {
    switch (type) {
      case 'auto': return this.dbConnectService.getDevisDetails(id);
      case 'habitation': return this.dbConnectService.getHabitationQuoteDetails(id);
      case 'obseques': return this.dbConnectService.getObsequesQuoteDetails(id);
      case 'voyage': return this.dbConnectService.getVoyageQuoteDetails(id);
      default: return of(null);
    }
  }
}
