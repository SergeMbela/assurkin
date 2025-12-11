import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interface décrivant la structure d'une personne avec ses coordonnées
export interface Person {
  id: number;
  nom: string | null;
  prenom: string | null;
  adresse: string | null;
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root' // Service disponible dans toute l'application
})
export class PersonService {

  private headers = new HttpHeaders({
    'apikey': environment.supabaseKey,
    'Authorization': `Bearer ${environment.supabaseKey}`
  });

  constructor(private http: HttpClient) { }

  /**
   * Récupère les personnes avec leurs coordonnées.
   * @returns Un Observable contenant un tableau de personnes.
   */
  getPeopleWithCoordinates(): Observable<Person[]> {
    // Appel à l'API REST de Supabase pour récupérer les personnes avec des coordonnées valides.
    const url = `${environment.supabaseUrl}/rest/v1/personnes?select=id,nom,prenom,adresse,latitude,longitude&latitude=not.is.null&longitude=not.is.null`;

    return this.http.get<Person[]>(url, { headers: this.headers });
  }
}