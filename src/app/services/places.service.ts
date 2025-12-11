import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
// Définissez l'interface correspondant à votre table Supabase
export interface LocationData {
  id: number;
  nom: string;
  latitude: number;
  longitude: number;
  adresse?: string; // Ajouter l'adresse, la rendre optionnelle si elle peut être nulle
}


@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private supabase: SupabaseClient;


  constructor() { this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey); }

  async getLocations(): Promise<LocationData[]> {
    // Remplacez 'locations' par le nom réel de votre table
    const { data, error } = await this.supabase
      .from('personnes')
      // C'est une bonne pratique de ne sélectionner que les colonnes nécessaires
      .select('id, nom, latitude, longitude, adresse');

    if (error) {
      console.error('Erreur Supabase:', error);
      return [];
    }
    return data as LocationData[];
  }
}
