import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PostgrestError, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface AutoFormData {
  // Define the properties you expect for the auto form
  // Example:
  name: string;
  email: string;
  vehicleType: 'car' | 'motorcycle';
}

export interface PostalCode {
  postalCode: string;
  city: string;
}

export interface Marque {
  marque_id: number;
  nom: string;
}

export interface Modele {
  marque_id: number;
  nom: string;
}

export interface Contrat {
  id: number;
  categorie: string;
  denomination: string;
  date_contract: string;
  date_validite: string;
  date_terme: string;
  statut: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export interface HabitationFormData {
  // Define properties for Habitation form
  // Example: address: string;
}

export interface RcFormData {
  // Define properties for RC form
}

export interface ObsequesFormData {
  // Define properties for Obseques form
}

export interface InfoRequestFormData {
  // Define properties for Info Request form
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

@Injectable({
  providedIn: 'root'
})
export class DbConnectService {

  constructor(private supabase: SupabaseService) { }

  /**
   * Enregistre les données du formulaire de contact général.
   * @param formData Les données du formulaire.
   * @returns Un Observable du résultat de l'insertion.
   */
  saveContactForm(formData: ContactFormData): Observable<SupabaseResponse<ContactFormData>> {
    return from(this.supabase.insertData('contact_submissions', formData)) as Observable<SupabaseResponse<ContactFormData>>;
  }

  /**
   * Enregistre les données du formulaire d'assurance auto.
   * @param formData Les données du formulaire.
   * @returns Un Observable du résultat de l'insertion.
   */
  saveAutoForm(formData: AutoFormData): Observable<SupabaseResponse<AutoFormData>> {
    return from(this.supabase.insertData('auto_quotes', formData)) as Observable<SupabaseResponse<AutoFormData>>;
  }

  /**
   * Enregistre les données du formulaire d'assurance habitation.
   * @param formData Les données du formulaire.
   * @returns Un Observable du résultat de l'insertion.
   */
  saveHabitationForm(formData: HabitationFormData): Observable<SupabaseResponse<HabitationFormData>> {
    return from(this.supabase.insertData('habitation_quotes', formData)) as Observable<SupabaseResponse<HabitationFormData>>;
  }

  /**
   * Enregistre les données du formulaire d'assurance RC familiale.
   * @param formData Les données du formulaire.
   * @returns Un Observable du résultat de l'insertion.
   */
  saveRcForm(formData: RcFormData): Observable<SupabaseResponse<RcFormData>> {
    return from(this.supabase.insertData('rc_familiale_quotes', formData)) as Observable<SupabaseResponse<RcFormData>>;
  }

  /**
   * Enregistre les données du formulaire d'assurance obsèques.
   * @param formData Les données du formulaire.
   * @returns Un Observable du résultat de l'insertion.
   */
  saveObsequesForm(formData: ObsequesFormData): Observable<SupabaseResponse<ObsequesFormData>> {
    return from(this.supabase.insertData('obseques_quotes', formData)) as Observable<SupabaseResponse<ObsequesFormData>>;
  }

  /**
   * Enregistre les données du formulaire d'assurance voyage et juridique.
   * @param formData Les données du formulaire.
   * @param type 'voyage' ou 'juridique'
   * @returns Un Observable du résultat de l'insertion.
   */
  saveInfoRequestForm(formData: InfoRequestFormData, type: 'voyage' | 'juridique'): Observable<SupabaseResponse<InfoRequestFormData>> {
    const tableName = type === 'voyage' ? 'info_requests' : 'juridique_form';
    return from(this.supabase.insertData(tableName, formData)) as Observable<SupabaseResponse<InfoRequestFormData>>;
  }

  /**
   * Récupère les codes postaux belges correspondant à un préfixe.
   * @param prefix Le préfixe du code postal à rechercher.
   * @returns Un Observable avec la liste des codes postaux correspondants.
   */

  getPostalCodes(prefix: string): Observable<PostalCode[]> {
    return from(
      this.supabase
        .fetchData('code_postal_belge', 'postal, name')
        .like('postal', `${prefix}%`)
        .limit(10)
    ).pipe(
      map(response => {
        return (response.data || []).map((item: any) => ({
          postalCode: item.postal,
          city: item.name,
        })) as PostalCode[];
      })
    );
  }


  /**
   * Récupère une liste de villes correspondant à un préfixe de nom.
   * @param namePrefix Le préfixe du nom de la ville à rechercher.
   * @returns Un Observable avec la liste des villes et leurs codes postaux.
   */
  getVilles(namePrefix: string): Observable<PostalCode[]> {
    return from(
      this.supabase
        .fetchData('code_postal_belge', 'postal, name')
        .ilike('name', `${namePrefix}%`)
        .limit(10) // Limite les résultats pour de meilleures performances
    ).pipe(
      map(response => {
        // Map les résultats pour correspondre à l'interface PostalCode
        const data = response.data as { postal: string; name: string; }[] | null;
        return (data || []).map(item => ({
          postalCode: item.postal,
          city: item.name
        }));
      })
    );
  }

  /**
   * Recherche les marques de véhicules correspondant à un préfixe.
   * @param prefix Le préfixe du nom de la marque à rechercher.
   * @returns Un Observable avec la liste des marques correspondantes.
   */
  searchMarques(prefix: string): Observable<Marque[]> {
    return from(
      this.supabase
        .fetchData('marques', 'marque_id:id, nom')
        .ilike('nom', `${prefix}%`)
        .limit(10)
    ).pipe(
      map(response => {
        const data = response.data as { marque_id: number; nom: string }[] | null;
        return (data || []).map((item) => ({
          marque_id: item.marque_id, // Now correctly mapped from 'id'
          nom: item.nom
        }));
      })
    );
  }

  /**
   * Recherche les modèles de véhicules pour une marque donnée et correspondant à un préfixe.
   * @param marqueId L'ID de la marque pour laquelle rechercher les modèles.
   * @param prefix Le préfixe du nom du modèle à rechercher.
   * @returns Un Observable avec la liste des modèles correspondants.
   */
  searchModeles(marqueId: number, prefix?: string): Observable<Modele[]> {
    let query = this.supabase
      .fetchData('modeles', 'marque_id, nom')
      .eq('marque_id', marqueId)
      .order('nom', { ascending: true });

    if (prefix) {
      query = query.ilike('nom', `${prefix}%`).limit(10);
    }

    return from(query).pipe(
      map(response => {
        const data = response.data as { marque_id: number; nom: string; }[] | null;
        return (data || []).map(item => ({
          marque_id: item.marque_id,
          nom: item.nom
        }));
      })
    );
  }

  /**
   * Récupère l'utilisateur actuellement authentifié.
   * @returns Un Observable avec les informations de l'utilisateur ou null.
   */
  getCurrentUser(): Observable<User | null> {
    return from(this.supabase.supabase.auth.getUser()).pipe(map(response => response.data.user));
  }

  /**
   * Récupère les contrats d'un utilisateur pour une catégorie donnée.
   * @param userId L'ID de l'utilisateur.
   * @param category La catégorie de contrat à récupérer.
   * @returns Un Observable avec la liste des contrats.
   */
  getContracts(userId: string, category: string): Observable<Contrat[]> {
    return from(
      this.supabase.supabase
        .from('contracts') // Assurez-vous que 'contracts' est le nom correct de votre table
        .select('id, categorie, denomination, date_contract, date_validite, date_terme, statut')
        .eq('user_id', userId)
        .eq('categorie', category)
    ).pipe(
      map(response => (response.data as Contrat[]) || [])
    );
  }


}