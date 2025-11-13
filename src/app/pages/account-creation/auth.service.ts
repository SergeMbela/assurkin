import { Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { from, Observable } from 'rxjs';
import { AuthResponse } from '@supabase/supabase-js';

@Injectable()
export class AuthService {

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Crée un nouvel utilisateur dans Supabase Auth.
   * @param credentials Les informations d'identification (email, mot de passe).
   * @param userData Les données utilisateur supplémentaires (prénom, nom, etc.).
   * @returns Un Observable de la réponse d'authentification.
   */
  signUp(credentials: { email: string, password: string }, userData: { firstName: string, lastName: string, gender: string }): Observable<AuthResponse> {
    return from(this.supabaseService.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          gender: userData.gender
          // Le numéro de mobile sera géré séparément si nécessaire,
          // car Supabase Auth le traite comme un canal d'authentification.
        }
      }
    }));
  }
}