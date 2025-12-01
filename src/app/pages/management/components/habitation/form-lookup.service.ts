import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { DbConnectService, Assureur, Statut } from '../../../../services/db-connect.service';

@Injectable({
  providedIn: 'root'
})
export class FormLookupService {
  // Utiliser shareReplay pour mettre en cache les résultats et éviter les appels multiples
  public readonly insuranceCompanies$: Observable<Assureur[]> = this.dbService.getAllAssureurs().pipe(
    shareReplay(1)
  );

  public readonly statuts$: Observable<Statut[]> = this.dbService.getAllStatuts().pipe(
    shareReplay(1)
  );

  public readonly nationalities$: Observable<any[]> = this.dbService.getNationalities().pipe(
    shareReplay(1)
  );

  constructor(private dbService: DbConnectService) {
    // Démarrer les appels dès que le service est instancié
    this.insuranceCompanies$.subscribe();
    this.statuts$.subscribe();
    this.nationalities$.subscribe();
  }
}