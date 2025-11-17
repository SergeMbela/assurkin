import { Injectable } from '@angular/core';
import { from, Observable, defer, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { PostgrestError, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { DevisAuto } from '../pages/mydata/mydata.component';

export interface AutoFormData {
  preneur: {
    genre: string;
    nom: string;
    prenom: string;
    dateNaissance: string;
    telephone: string;
    email: string;
    adresse: string;
    codePostal: string;
    ville: string;
    permis: string;
    datePermis: string;
  };
  conducteurDifferent: boolean;
  conducteur: {
    genre: string;
    nom: string;
    prenom: string;
    dateNaissance: string;
    adresse: string;
    codePostal: string;
    ville: string;
    permis: string;
    datePermis: string;
  };
  vehicule: {
    type: string;
    marque: string;
    modele: string;
    puissance: number;
    places: number;
    dateCirculation: string;
    valeur?: number; // Optional
  };
  garanties: {
    base: boolean;
    omnium: 'non' | 'partiel' | 'total';
    conducteur: boolean;
    assistance: boolean;
  };
  dateEffet: string;
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
  preneur: {
    genre: string;
    nom: string;
    prenom: string;
    dateNaissance: string;
    telephone: string;
    email: string;
  };
  batiment: {
    adresse: string;
    codePostal: string;
    ville: string;
    typeMaison: string;
  };
  evaluation: {
    valeurBatiment: string;
    superficie: number;
    nombrePieces: number;
    loyer?: number;
    valeurContenu: string;
    valeurExpertise?: number;
    dateExpertise?: string;
    valeurLibre?: number;
  };
  garanties: {
    contenu: boolean;
    vol: boolean;
    pertesIndirectes: boolean;
    protectionJuridique: boolean;
    assistance: boolean;
  };
  dateEffet: string;
}

export interface RcFormData {
  preneur: {
    nom: string;
    prenom: string;
    genre: string;
    telephone: string;
    email: string;
    adresse: string;
    codePostal: string;
    ville: string;
  };
  risque: 'famille' | 'isole';
  dateEffet: string;
}

export interface UserData {
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  permis: string;
  dateNaissance: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  genre: string;
  datePermis: string;
}

export interface ObsequesFormData {
  preneur: {
    genre: string;
    nom: string;
    prenom: string;
    dateNaissance: string;
    telephone: string;
    email: string;
    adresse: string;
    codePostal: string;
    ville: string;
  };
  nombreAssures: number;
  preneurEstAssure: boolean;
  assures: {
    nom: string;
    prenom: string;
    dateNaissance: string;
    capital: number;
  }[];
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
   * Crée un devis complet pour l'assurance auto en insérant les données dans plusieurs tables.
   * @param formData Les données complètes du formulaire d'assurance auto.
   * @returns Un Observable du devis créé.
   */
  createFullDevis(formData: AutoFormData): Observable<any> {
    // Use defer to wrap the async logic in an Observable
    return defer(async () => {
      // -----------------------------------------------------------------
      // ÉTAPE 1: Chercher ou créer le Preneur
      // -----------------------------------------------------------------
      let preneur;

      // On cherche d'abord si un utilisateur avec cet email existe
      const { data: existingPreneur, error: selectError } = await this.supabase.supabase
        .from('personnes')
        .select('*')
        .eq('email', formData.preneur.email)
        .single();

      if (existingPreneur) {
        // L'utilisateur existe, on utilise ses données
        preneur = existingPreneur;
        console.log('Preneur existant trouvé:', preneur);
      } else {
        // L'utilisateur n'existe pas, on le crée
        console.log('Aucun preneur existant, création en cours...');
        const { data: newPreneur, error: insertError } = await this.supabase.supabase
            .from('personnes')
            .insert({
              genre: formData.preneur.genre,
              nom: formData.preneur.nom,
              prenom: formData.preneur.prenom,
              date_naissance: formData.preneur.dateNaissance,
              telephone: formData.preneur.telephone,
              email: formData.preneur.email,
              adresse: formData.preneur.adresse,
              code_postal: formData.preneur.codePostal,
              ville: formData.preneur.ville,
              permis_numero: formData.preneur.permis,
              permis_date: formData.preneur.datePermis
            }).select().single();
        if (insertError) throw insertError;
        preneur = newPreneur;
      }

        // -----------------------------------------------------------------
        // ÉTAPE 2: Insérer le Conducteur
        // -----------------------------------------------------------------
        let conducteur = null;
        if (formData.conducteurDifferent) {
            const { data: conducteurData, error: conducteurError } = await this.supabase.supabase
            .from('personnes')
            .insert({
              genre: formData.conducteur.genre,
              nom: formData.conducteur.nom,
              prenom: formData.conducteur.prenom,
              date_naissance: formData.conducteur.dateNaissance,
              adresse: formData.conducteur.adresse,
              code_postal: formData.conducteur.codePostal,
              ville: formData.conducteur.ville,
              permis_numero: formData.conducteur.permis,
              permis_date: formData.conducteur.datePermis
            })
            .select()
            .single();

            if (conducteurError) throw conducteurError;
            conducteur = conducteurData;
        } else {
            // If the driver is the same as the policyholder, use the policyholder's data
            conducteur = preneur;
        }

        // -----------------------------------------------------------------
        // ÉTAPE 3: Insérer le Véhicule
        // -----------------------------------------------------------------
        const { data: vehicule, error: vehiculeError } = await this.supabase.supabase
          .from('vehicules')
          .insert({
            type: formData.vehicule.type,
            marque: formData.vehicule.marque,
            modele: formData.vehicule.modele,
            puissance_kw: formData.vehicule.puissance,
            places: formData.vehicule.places,
            date_circulation: formData.vehicule.dateCirculation,
            valeur: formData.vehicule.valeur
          })
          .select()
          .single();

        if (vehiculeError) throw vehiculeError;

        // -----------------------------------------------------------------
        // ÉTAPE 4: Lier le tout dans le Devis
        // -----------------------------------------------------------------
        const { data: devis, error: devisError } = await this.supabase.supabase
          .from('devis_assurance')
          .insert({
            preneur_id: preneur.id,
            conducteur_id: conducteur.id,
            vehicule_id: vehicule.id,
            garantie_base_rc: formData.garanties.base,
            garantie_omnium_niveau: formData.garanties.omnium,
            garantie_conducteur: formData.garanties.conducteur,
            garantie_assistance: formData.garanties.assistance,
            date_effet: formData.dateEffet
          })
          .select()
          .single();

        if (devisError) throw devisError;

        console.log('Devis créé avec succès:', devis);
        return devis; // Return the final created quote
    });
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
   * Crée un devis complet pour l'assurance habitation.
   * @param formData Les données du formulaire habitation.
   * @returns Un Observable avec le résultat de l'insertion.
   */
  createHabitationQuote(formData: HabitationFormData): Observable<any> {
    return defer(async () => {
      // ÉTAPE 1: Chercher ou créer le preneur
      let preneur;
      const { data: existingPreneur, error: selectError } = await this.supabase.supabase
        .from('personnes')
        .select('*')
        .eq('email', formData.preneur.email)
        .single();

      if (existingPreneur) {
        // La personne existe, on utilise son ID.
        preneur = existingPreneur;
      } else {
        // La personne n'existe pas, on la crée.
        const { data: newPreneur, error: insertError } = await this.supabase.supabase
          .from('personnes')
          .insert({
            genre: formData.preneur.genre,
            nom: formData.preneur.nom,
            prenom: formData.preneur.prenom,
            date_naissance: formData.preneur.dateNaissance,
            telephone: formData.preneur.telephone,
            email: formData.preneur.email,
          }).select().single();
        if (insertError) throw insertError;
        preneur = newPreneur;
      }

      // ÉTAPE 2: Insérer le devis habitation
      const quoteData = {
        preneur_id: preneur.id,
        // Informations sur le bâtiment
        batiment_adresse: formData.batiment.adresse,
        batiment_code_postal: formData.batiment.codePostal,
        batiment_ville: formData.batiment.ville,
        batiment_type_maison: formData.batiment.typeMaison,

        // Informations sur l'évaluation
        evaluation_type_valeur_batiment: formData.evaluation.valeurBatiment,
        evaluation_superficie: formData.evaluation.superficie,
        evaluation_nombre_pieces: formData.evaluation.nombrePieces,
        evaluation_loyer_mensuel: formData.evaluation.loyer,
        evaluation_type_valeur_contenu: formData.evaluation.valeurContenu,
        evaluation_valeur_expertise: formData.evaluation.valeurExpertise,
        // On convertit la date YYYY-MM en YYYY-MM-DD pour la base de données
        evaluation_date_expertise: formData.evaluation.dateExpertise ? `${formData.evaluation.dateExpertise}-01` : null,
        evaluation_valeur_libre_contenu: formData.evaluation.valeurLibre,

        // Garanties
        garantie_contenu: formData.garanties.contenu,
        garantie_vol: formData.garanties.vol,
        garantie_pertes_indirectes: formData.garanties.pertesIndirectes,
        garantie_protection_juridique: formData.garanties.protectionJuridique,
        garantie_assistance: formData.garanties.assistance,

        date_effet: formData.dateEffet,
      };

      return this.supabase.insertData('habitation_quotes', quoteData);
    });
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
    return this.createObsequesQuote(formData);
  }

  /**
   * Crée un devis complet pour l'assurance obsèques.
   * @param formData Les données du formulaire obsèques.
   * @returns Un Observable avec le résultat de l'insertion.
   */
  createObsequesQuote(formData: ObsequesFormData): Observable<any> {
    return defer(async () => {
      // ÉTAPE 1: Chercher ou créer le preneur
      let preneur;
      const { data: existingPreneur } = await this.supabase.supabase
        .from('personnes')
        .select('*')
        .eq('email', formData.preneur.email)
        .single();

      if (existingPreneur) {
        preneur = existingPreneur;
      } else {
        const { data: newPreneur, error: insertError } = await this.supabase.supabase
          .from('personnes')
          .insert({ ...formData.preneur, date_naissance: formData.preneur.dateNaissance, code_postal: formData.preneur.codePostal })
          .select().single();
        if (insertError) throw insertError;
        preneur = newPreneur;
      }

      // ÉTAPE 2: Insérer le devis obsèques
      const quoteData = {
        preneur_id: preneur.id,
        nombre_assures: formData.nombreAssures,
        preneur_est_assure: formData.preneurEstAssure,
        assures: formData.assures, // Sera stocké en JSONB
      };

      return this.supabase.insertData('obseques_quotes', quoteData);
    });
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
    if (category === 'auto') {
      // Pour la catégorie 'auto', on va chercher dans les devis
      return from(
        this.supabase.supabase
          .from('devis_assurance')
          .select(`
            id,
            date_effet,
            statut,
            vehicules ( marque, modele ),
            personnes!devis_assurance_preneur_id_fkey!inner ( user_id )
          `)
          .eq('personnes.user_id', userId) // Filtre sur l'ID de l'utilisateur lié à la personne (preneur)
      ).pipe(
        map(response => {
          if (response.error) throw response.error;
          // On transforme les données de 'devis_assurance' pour qu'elles correspondent à l'interface 'Contrat'
          return (response.data || []).map((item: any) => ({
            id: item.id,
            categorie: 'Auto',
            denomination: `${item.vehicules.marque} ${item.vehicules.modele}`,
            date_contract: item.date_effet, // Utilise date_effet comme date de contrat
            date_validite: item.date_effet,
            date_terme: '', // Pas de date de terme pour un devis
            statut: item.statut || 'Devis en attente'
          }));
        })
      );
    } else if (category === 'habitation') {
      console.log('Récupération des devis habitation pour l\'utilisateur ID:', userId); 
      // Pour la catégorie 'habitation', on va chercher dans les devis habitation
      return from(
        this.supabase.supabase
          .from('habitation_quotes')
          .select(`
            id,
            date_effet,
            statut,
            batiment_type_maison,
            batiment_adresse,
            personnes!habitation_quotes_preneur_id_fkey!inner ( user_id )
          `)
          .eq('personnes.user_id', userId)
      ).pipe(
        map(response => {
          if (response.error) throw response.error;
          console.log('Données brutes des devis habitation:', response.data);
          return (response.data || []).map((item: any) => ({
            id: item.id,
            categorie: 'Habitation',
            denomination: item.batiment_adresse ? `${item.batiment_type_maison} - ${item.batiment_adresse}` : item.batiment_type_maison,
            date_contract: item.date_effet,
            date_validite: item.date_effet,
            date_terme: '',
            statut: item.statut || 'Devis en attente'
          }));
        })
      );
    } else if (category === 'obseques') {
      // Pour la catégorie 'obseques', on va chercher dans les devis obsèques
      return from(
        this.supabase.supabase
          .from('obseques_quotes')
          .select(`
            id,
            created_at,
            nombre_assures,
            personnes!obseques_quotes_preneur_id_fkey!inner ( user_id )
          `)
          .eq('personnes.user_id', userId)
      ).pipe(
        map(response => {
          if (response.error) throw response.error;
          return (response.data || []).map((item: any) => ({
            id: item.id,
            categorie: 'Obsèques',
            denomination: `Devis pour ${item.nombre_assures} personne(s)`,
            date_contract: item.created_at,
            date_validite: item.created_at,
            date_terme: '',
            statut: 'Devis en attente' // Statut par défaut pour les devis
          }));
        })
      );
    } else {
      // Logique existante pour les autres types de contrats
      return from(
        this.supabase.supabase.from('contracts').select('*').eq('user_id', userId).eq('categorie', category)
      ).pipe(
        map(response => (response.data as Contrat[]) || [])
      );
    }
  }

  /**
   * Vérifie si un email existe déjà dans la table 'personnes'.
   * @param email L'email à vérifier.
   * @returns Un Observable qui émet true si l'email existe, sinon false.
   */
  checkEmailExists(email: string): Observable<boolean> {
    return from(
      this.supabase.supabase
        .from('personnes')
        .select('email', { count: 'exact', head: true }) // Optimisé pour ne vérifier que l'existence
        .eq('email', email)
    ).pipe(
      map(response => {
        // Si le count est supérieur à 0, l'email existe.
        return (response.count ?? 0) > 0;
      }),
      catchError(error => {
        console.error('Erreur lors de la vérification de l\'email:', error);
        return of(false); // En cas d'erreur, on suppose que l'email n'existe pas pour ne pas bloquer l'utilisateur.
      })
    );
  }

  /**
   * Vérifie si un numéro de permis existe déjà dans la table 'personnes'.
   * @param permis Le numéro de permis à vérifier.
   * @returns Un Observable qui émet true si le numéro de permis existe, sinon false.
   */
  checkPermisExists(permis: string): Observable<boolean> {
    return from(
      this.supabase.supabase
        .from('personnes')
        .select('permis_numero', { count: 'exact', head: true })
        .eq('permis_numero', permis)
    ).pipe(
      map(response => {
        return (response.count ?? 0) > 0;
      }),
      catchError(error => {
        console.error('Erreur lors de la vérification du permis:', error);
        return of(false);
      })
    );
  }

  /**
   * Crée un nouvel utilisateur (authentification + profil).
   * @param userData Les données complètes de l'utilisateur.
   * @returns Un Observable avec la réponse de la création du profil.
   */
  createUser(userData: UserData): Observable<any> {
    return from(this.supabase.supabase.auth.signUp({
      email: userData.email,
      password: userData.password!,
    })).pipe(
      switchMap(({ data: authData, error: authError }) => {
        if (authError) {
          throw authError; // Propage l'erreur d'authentification
        }
        if (!authData.user) {
          throw new Error("La création de l'utilisateur a échoué, aucun utilisateur retourné.");
        }

        // L'authentification a réussi, on insère les données dans la table 'personnes'
        const userProfile = {
          user_id: authData.user.id, // Clé étrangère vers auth.users
          nom: userData.nom,
          prenom: userData.prenom,
          email: userData.email,
          telephone: userData.telephone,
          adresse: userData.adresse,
          code_postal: userData.codePostal,
          ville: userData.ville,
          date_naissance: userData.dateNaissance,
          permis_numero: userData.permis,
          permis_date: userData.datePermis,
          genre: userData.genre,
        };

        // On insère le profil, puis on crée le dossier de stockage
        return from(this.supabase.supabase.from('personnes').insert(userProfile).select().single()).pipe(
          switchMap(profileResponse => {
            if (profileResponse.error) {
              throw profileResponse.error;
            }
            // Une fois le profil créé, on crée le dossier de stockage et on retourne la réponse du profil.
            return this.createUserStorageFolder(authData.user!.id).pipe(map(() => profileResponse));
          })
        );
      })
    );
  }

  /**
   * Récupère les devis d'assurance auto pour un utilisateur donné.
   * @param userId L'ID de l'utilisateur connecté.
   * @returns Un Observable avec un tableau de devis auto.
   */
  getDevisAuto(userId: string): Observable<DevisAuto[]> {
    console.log(`[getDevisAuto] Récupération des devis pour l'ID utilisateur: ${userId}`);
    const devis$ = from(
      this.supabase.supabase
        .from('devis_assurance')
        .select(
          `
            id,
            date_effet,
            vehicules ( marque, modele ),
            personnes!inner (
              user_id
            )
          `
        )
        .eq('personnes.user_id', userId) // Filtre sur l'ID de l'utilisateur lié à la personne
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des devis auto:', response.error);
          throw response.error;
        }
        console.log('[getDevisAuto] Données brutes reçues de Supabase:', response.data);
        // Le typage 'unknown' est une bonne pratique avant un cast forcé.
        // Supabase retourne un objet pour les relations to-one, ce qui correspond maintenant à notre interface.
        return response.data as unknown as DevisAuto[];
      }),
      catchError(error => {
        console.error('Erreur dans le pipe de getDevisAuto:', error);
        return of([]); // Retourne un tableau vide en cas d'erreur
      })
    );
    return devis$;
  }

  /**
   * Récupère les données d'une personne par son email.
   * @param email L'email de la personne à rechercher.
   * @returns Un Observable avec les données de la personne ou null.
   */
  getPersonByEmail(email: string): Observable<any | null> {
    return from(
      this.supabase.supabase
        .from('personnes')
        .select('*')
        .eq('email', email)
        .single()
    ).pipe(
      map(response => {
        // PGRST116: "exact one row expected, but 0 or more rows were returned"
        // C'est normal si l'email n'est pas trouvé, donc on ne logue pas d'erreur dans ce cas.
        if (response.error && response.error.code !== 'PGRST116') {
          console.error('Erreur lors de la récupération de la personne par email:', response.error);
        }
        return response.data;
      })
    );
  }

  /**
   * Lie un compte utilisateur authentifié (auth.users) à un enregistrement dans la table 'personnes' via l'email.
   * @param userId L'ID de l'utilisateur authentifié.
   * @param userEmail L'email de l'utilisateur.
   * @returns Un Observable avec le résultat de la mise à jour.
   */
  linkUserToPerson(userId: string, userEmail: string): Observable<any> {
    // Étape 1: Récupérer la personne par email pour vérifier si le dossier existe déjà
    return this.getPersonByEmail(userEmail).pipe(
      switchMap(person => {
        if (!person) {
          // Si aucune personne n'est trouvée avec cet email, on ne fait rien.
          return of(null);
        }

        // Étape 2: Mettre à jour le user_id (si nécessaire)
        const updatePromise = person.user_id !== userId
          ? this.supabase.supabase.from('personnes').update({ user_id: userId }).eq('id', person.id)
          : Promise.resolve();

        return from(updatePromise).pipe(
          switchMap(() => {
            // Étape 3: Vérifier si le dossier doit être créé
            if (person.folder_id === true) {
              // Le dossier existe déjà, on ne fait rien de plus.
              return of({ status: 'folder_exists' });
            } else {
              // Le dossier n'existe pas, on le crée.
              return this.createUserStorageFolder(userId).pipe(
                switchMap(() => {
                  // Étape 4: Mettre à jour le flag folder_id à true
                  return from(
                    this.supabase.supabase.from('personnes').update({ folder_id: true }).eq('id', person.id)
                  );
                })
              );
            }
          })
        );
      })
    );
  }

  /**
   * Récupère les détails complets d'un devis d'assurance auto par son ID.
   * @param devisId L'ID du devis à récupérer.
   * @returns Un Observable avec les détails du devis.
   */
  getDevisDetails(devisId: number): Observable<any> {
    return from(
      this.supabase.supabase
        .from('devis_assurance')
        .select(`
          *,
          preneur:personnes!devis_assurance_preneur_id_fkey(*),
          conducteur:personnes!devis_assurance_conducteur_id_fkey(*),
          vehicule:vehicules(*)
        `)
        .eq('id', devisId)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }

  /**
   * Récupère les détails complets d'un devis d'assurance habitation par son ID.
   * @param devisId L'ID du devis à récupérer.
   * @returns Un Observable avec les détails du devis.
   */
  getHabitationQuoteDetails(devisId: number): Observable<any> {
    return from(
      this.supabase.supabase
        .from('habitation_quotes')
        .select(`
          *,
          preneur:personnes!habitation_quotes_preneur_id_fkey(*)
        `)
        .eq('id', devisId)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }

  /**
   * Récupère les détails complets d'un devis d'assurance obsèques par son ID.
   * @param devisId L'ID du devis à récupérer.
   * @returns Un Observable avec les détails du devis.
   */
  getObsequesQuoteDetails(devisId: number): Observable<any> {
    return from(
      this.supabase.supabase
        .from('obseques_quotes')
        .select(`
          *,
          preneur:personnes!obseques_quotes_preneur_id_fkey(*)
        `)
        .eq('id', devisId)
        .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }

  /**
   * Crée un dossier de stockage pour un utilisateur.
   * Le nom du dossier correspond aux 8 premiers caractères de l'ID utilisateur.
   * @param userId L'ID de l'utilisateur (UUID).
   * @returns Un Observable avec le résultat de la création du dossier.
   */
  createUserStorageFolder(userId: string): Observable<any> {
    const folderName = userId.substring(0, 8);
    const bucketName = 'documents_assurances'; // Assurez-vous que ce bucket existe dans votre projet Supabase.
    const placeholderFileName = '.emptyFolderPlaceholder';
    const filePath = `${folderName}/${placeholderFileName}`;

    // Supabase crée les dossiers implicitement lors du téléversement d'un fichier.
    // On téléverse donc un fichier vide pour forcer la création du dossier.
    return from(
      this.supabase.supabase.storage
        .from(bucketName)
        .upload(filePath, new Blob(['']), {
          cacheControl: '3600',
          upsert: false // Ne pas écraser si le fichier existe déjà
        })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error(`Erreur lors de la création du dossier de stockage pour ${userId}:`, response.error);
        }
        return response;
      })
    );
  }
}