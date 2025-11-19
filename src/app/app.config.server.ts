import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { DbConnectService } from './services/db-connect.service';
import { Observable, of } from 'rxjs';

/**
 * Classe factice (mock) pour remplacer DbConnectService côté serveur.
 * Ses méthodes retournent des Observables vides pour ne pas bloquer le rendu SSR.
 */
export class MockDbConnectService {
  // Implémentez les méthodes utilisées par vos composants, en retournant des Observables vides.
  getAllAutoQuotes(): Observable<any[]> { return of([]); }
  getAllHabitationQuotes(): Observable<any[]> { return of([]); }
  getAllObsequesQuotes(): Observable<any[]> { return of([]); }
  getAllVoyageQuotes(): Observable<any[]> { return of([]); }
  // Ajoutez d'autres méthodes si nécessaire...
}

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(), { provide: DbConnectService, useClass: MockDbConnectService }]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
