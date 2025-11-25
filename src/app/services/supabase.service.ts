import { Injectable } from '@angular/core';
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

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

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

  private async getSessionOnStart() {
    const { data } = await this.supabase.auth.getSession();
    this._session$.next(data.session);
  }

  insertData(table: string, data: any) {
    return this.supabase
      .from(table)
      .insert([data]);
  }

  fetchData(table: string, query: string) {
    return this.supabase
      .from(table)
      .select(query);
  }
}
