import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);

  /** Un observable de la session actuelle. Émet `null` si l'utilisateur n'est pas connecté. */
  public session$: Observable<Session | null> = this.sessionSubject.asObservable();

  /** Un observable de l'utilisateur actuel. Émet `null` si l'utilisateur n'est pas connecté. */
  public currentUser$: Observable<User | null> = this.session$.pipe(
    map(session => session?.user ?? null)
  );

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    if (isPlatformBrowser(this.platformId)) {
      // Écoute les changements d'état d'authentification et met à jour le sujet de session.
      // C'est la seule source de vérité pour l'état de la session.
      this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        this.sessionSubject.next(session);
      });
    }
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
