import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private _session$ = new BehaviorSubject<Session | null>(null);
  public session$ = this._session$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    if (isPlatformBrowser(this.platformId)) {
      // Écoute les changements d'état d'authentification (connexion, déconnexion, etc.)
      this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        // On met à jour la session uniquement si elle n'est pas null.
        // Si la session est null (déconnexion), le client Supabase le gère déjà.
        // Cette vérification corrige l'erreur de typage.
        if (session) this.supabase.auth.setSession(session);
        this._session$.next(session);
      });

      // Vérifie s'il y a une session active au démarrage de l'application
      this.getSessionOnStart();
    }
  }

  private async getSessionOnStart() {
    const { data } = await this.supabase.auth.getSession();
    this._session$.next(data.session);
  }

  async insertData(table: string, data: any) {
    console.log(`[SupabaseService] Tentative d'insertion dans la table '${table}' avec les données:`, data);
    const response = await this.supabase
      .from(table)
      .insert([data]);

    if (response.error) {
      console.error(`[SupabaseService] Erreur lors de l'insertion dans la table '${table}':`, response.error);
    }

    return response;
  }

  async fetchData(table: string, query: string) {
    console.log(`[SupabaseService] Tentative de lecture depuis la table '${table}' avec la requête:`, query);
    const response = await this.supabase
      .from(table)
      .select(query);

    if (response.error) {
      console.error(`[SupabaseService] Erreur lors de la lecture depuis la table '${table}':`, response.error);
    }

    return response;
  }
}
