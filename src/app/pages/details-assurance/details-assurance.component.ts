import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DbConnectService } from '../../services/db-connect.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-details-assurance',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './details-assurance.component.html',
})
export class DetailsAssuranceComponent implements OnInit {
  devisDetails$: Observable<any | null>;
  loadingError = false;

  constructor(
    private route: ActivatedRoute,
    private dbConnectService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.devisDetails$ = of(null);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const devisId = this.route.snapshot.paramMap.get('id');
      const urlPath = this.route.snapshot.url[0]?.path || '';
      let contractType = 'auto'; // Par défaut
      if (urlPath.includes('habitation')) {
        contractType = 'habitation';
      } else if (urlPath.includes('obseques')) {
        contractType = 'obseques';
      }

      if (devisId) {
        let detailsObservable: Observable<any>;

        if (contractType === 'habitation') {
          detailsObservable = this.dbConnectService.getHabitationQuoteDetails(+devisId);
        } else if (contractType === 'obseques') {
          detailsObservable = this.dbConnectService.getObsequesQuoteDetails(+devisId);
        } else {
          detailsObservable = this.dbConnectService.getDevisDetails(+devisId);
        }

        this.devisDetails$ = detailsObservable.pipe(catchError(error => {
          console.error('Erreur lors de la récupération des détails du devis:', error);
          this.loadingError = true;
          return of(null);
        }));
      } else {
        this.loadingError = true;
      }
    }
  }
}