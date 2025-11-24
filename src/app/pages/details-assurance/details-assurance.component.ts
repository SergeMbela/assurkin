import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { DbConnectService } from '../../services/db-connect.service';

@Component({
  selector: 'app-details-assurance',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './details-assurance.component.html',
  styleUrls: ['./details-assurance.component.css']
})
export class DetailsAssuranceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dbConnectService = inject(DbConnectService);

  devisDetails$!: Observable<any>;
  loadingError = false;

  ngOnInit(): void {
    const devisId = Number(this.route.snapshot.paramMap.get('id'));
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    let devisType = navigationState ? navigationState['type'] : null;

    // Si le type n'est pas dans le state (ex: navigation depuis /mydata),
    // on essaie de le déduire de l'URL.
    if (!devisType) {
      const url = this.router.url;
      if (url.includes('/assurance_auto/')) devisType = 'auto';
      else if (url.includes('/assurance_habitation/')) devisType = 'habitation';
      else if (url.includes('/assurance_obseques/')) devisType = 'obseques'; 
      // La logique pour /management/ est retirée car le type est TOUJOURS
      // fourni par le 'state' de la navigation depuis cette page.
      // Cette section est une solution de secours pour les autres pages comme /mydata.
    }

    if (isNaN(devisId) || !devisType) {
      this.loadingError = true;
      this.devisDetails$ = of(null);
      return;
    }

    this.devisDetails$ = this.getDetailsObservable(devisType, devisId).pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des détails du devis:', error);
        this.loadingError = true;
        return of(null);
      })
    );
  }

  private getDetailsObservable(type: string, id: number): Observable<any> {
    switch (type) {
      case 'auto': return this.dbConnectService.getDevisDetails(id);
      case 'habitation': return this.dbConnectService.getHabitationQuoteDetails(id);
      case 'obseques': return this.dbConnectService.getObsequesQuoteDetails(id); // This was missing
      case 'voyage': return this.dbConnectService.getVoyageQuoteDetails(id);
      // Ajoutez d'autres cas ici pour les futurs types de devis
      default: return of(null);
    }
  }
}