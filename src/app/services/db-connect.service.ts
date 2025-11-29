import { Injectable } from '@angular/core';
import { from, Observable, defer, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { PostgrestError, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { DevisAuto } from '../pages/mydata/mydata.component';

export interface AutoQuoteUpdatePayload {
  p_preneur: { [key: string]: any };
  p_conducteur?: { [key: string]: any };
  p_vehicule: { [key: string]: any };
  p_devis: {
    garantie_base_rc: boolean;
    garantie_omnium_niveau: string;
    garantie_conducteur: boolean;
    garantie_assistance: boolean;
    date_effet: string;
    compagnie_id?: number | null;
    statut?: string;
  };
}
export interface ObsequesQuoteUpdatePayload {
  preneur: { [key: string]: any };
  devis: {
    preneur_est_assure: boolean;
    assures: any[];
    nombre_assures: number;
    compagnie_id?: number | null;
    statut?: string;
  };
}

export interface HabitationQuoteUpdatePayload {
  p_preneur: { [key: string]: any };
  p_devis: {
    // Bâtiment (correspond aux colonnes batiment_*)
    batiment_adresse: string;
    batiment_code_postal: string;
    batiment_ville: string;
    batiment_type_maison: string;
    // Évaluation (correspond aux colonnes evaluation_*)
    evaluation_type_valeur_batiment: string;
    evaluation_superficie: number;
    evaluation_nombre_pieces: number;
    evaluation_loyer_mensuel: number;
    evaluation_type_valeur_contenu: string;
    evaluation_valeur_expertise: number;
    evaluation_date_expertise: string | null;
    // Garanties (correspond aux colonnes garantie_*)
    garantie_contenu: boolean;
    garantie_vol: boolean;
    garantie_pertes_indirectes: boolean;
    garantie_protection_juridique: boolean;
    garantie_assistance: boolean;
    date_effet: string | null;
    statut?: string;
    compagnie_id?: number | null;
  };
}
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

export interface Assureur {
  id: number;
  nom: string;
}

export interface Statut {
  id: number;
  statut: string | null;
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

export interface SubjectContract {
  id: number;
  created_at: string;
  title: string | null;
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
  preneur_nom: string;
  preneur_prenom: string;
  preneur_genre: string;
  preneur_telephone: string;
  preneur_email: string;
  preneur_adresse: string;
  preneur_code_postal: string;
  preneur_ville: string;
  risque: 'famille' | 'isole' | null;
  date_effet: string | null;
}

export interface VoyageFormData {
  nom: string;
  prenom: string;
  email: string;
  gsm?: string | null;
  description?: string | null;
  // Les champs statut, document, et date_created sont gérés par la base de données.
}

export interface Nationality {
  id: number;
  nationality: string;
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

export interface EcheanceStatus {
  id: number;
  id_echeance: number;
  label: string;
}

export interface DocumentType {
  id: number;
  created_at: string;
  Label: string;
  view: string | null;
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
      // ÉTAPE 1: Chercher ou créer le Preneur.
      // -----------------------------------------------------------------
      const preneur = await this.findOrCreatePerson({
        ...formData.preneur,
        code_postal: formData.preneur.codePostal,
        permis_numero: formData.preneur.permis,
        permis_date: formData.preneur.datePermis
      });

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

      if (!conducteur || !vehicule) throw new Error('Could not create driver or vehicle.');

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
      // ÉTAPE 1: Chercher ou créer le preneur.
      const preneur = await this.findOrCreatePerson({
        ...formData.preneur,
        adresse: formData.batiment.adresse,
        code_postal: formData.batiment.codePostal,
        ville: formData.batiment.ville
      });

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

      const { data, error } = await this.supabase.insertData('habitation_quotes', quoteData);
      if (error) {
        throw error;
      }
      return data;
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
   * Enregistre les données du formulaire d'assurance voyage.
   * @param formData Les données du formulaire.
   * @returns Un Observable du résultat de l'insertion.
   */
  saveVoyageForm(formData: VoyageFormData): Observable<SupabaseResponse<VoyageFormData>> {
    return from(this.supabase.insertData('assu_voyage', formData)) as Observable<SupabaseResponse<VoyageFormData>>;
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
      // ÉTAPE 1: Chercher ou créer le preneur.
      const preneur = await this.findOrCreatePerson({
        ...formData.preneur,
        date_naissance: formData.preneur.dateNaissance,
        code_postal: formData.preneur.codePostal
      });

      // ÉTAPE 2: Insérer le devis obsèques
      const quoteData = {
        preneur_id: preneur.id,
        nombre_assures: formData.nombreAssures,
        preneur_est_assure: formData.preneurEstAssure,
        assures: formData.assures, // Sera stocké en JSONB
      };

      const { data, error } = await this.supabase.insertData('obseques_quotes', quoteData);
      if (error) {
        throw error;
      }
      return data;
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
   * Récupère la liste des villes pour un code postal exact.
   * @param postalCode Le code postal exact à rechercher.
   * @returns Un Observable avec la liste des noms de villes.
   */
  getCitiesByPostalCode(postalCode: string): Observable<string[]> {
    return from(
      this.supabase
        .fetchData('code_postal_belge', 'name') // Sélectionne uniquement le nom de la ville
        .eq('postal', postalCode) // Correspondance exacte du code postal
    ).pipe(
      map(response => {
        const data = response.data as { name: string; }[] | null;
        return (data || []).map(item => item.name);
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des villes par code postal:', error);
        return of([]);
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
   * Recherche les compagnies d'assurance correspondant à un préfixe.
   * @param prefix Le préfixe du nom de la compagnie à rechercher.
   * @returns Un Observable avec la liste des compagnies correspondantes.
   */
  searchAssureurs(prefix: string): Observable<Assureur[]> {
    return from(
      this.supabase
        .fetchData('assureurs_belges', 'id, nom_assureur')
        .ilike('nom_assureur', `${prefix}%`)
        .order('nom_assureur', { ascending: true })
        .limit(10)
    ).pipe(
      map(response => {
        console.log('Compagnies d\'assurance reçues:', response.data);
        // La colonne dans la base de données est 'nom_assureur', pas 'nom'.
        const data = response.data as { id: number; nom_assureur: string }[] | null;
        return (data || []).map((item) => ({
          id: item.id,
          nom: item.nom_assureur
        }));
      })
    );
  }

  /**
   * Récupère un assureur par son ID.
   * @param id L'ID de l'assureur à récupérer.
   * @returns Un Observable avec les détails de l'assureur.
   */
  getInsurerById(id: number): Observable<Assureur> {
    return from(
      this.supabase.supabase
        .from('assureurs_belges')
        .select('id, nom_assureur')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        // Si une erreur est retournée par Supabase OU si aucune donnée n'est trouvée
        if (response.error || !response.data) {
          console.error(`Erreur lors de la récupération de l'assureur avec l'ID ${id}:`, response.error);
          // Lève une erreur claire si l'assureur n'est pas trouvé
          throw response.error || new Error(`Aucun assureur trouvé pour l'ID ${id}`);
        }
        // À ce stade, nous sommes sûrs que response.data n'est pas null
        return {
          id: response.data.id,
          nom: response.data.nom_assureur
        } as Assureur;
      })
    );
  }

  /**
   * Récupère la liste complète des compagnies d'assurance.
   * @returns Un Observable avec la liste de toutes les compagnies.
   */
  getAllAssureurs(): Observable<Assureur[]> {
    return from(
      this.supabase
        .fetchData('assureurs_belges', 'id, nom_assureur')
        .order('nom_assureur', { ascending: true })
    ).pipe(
      map(response => {
        const data = response.data as { id: number; nom_assureur: string }[] | null;
        return (data || []).map((item) => ({
          id: item.id,
          nom: item.nom_assureur
        }));
      })
    );
  }

  /**
   * Récupère la liste de tous les statuts de devis.
   * @returns Un Observable avec la liste des statuts.
   */
  getAllStatuts(): Observable<Statut[]> {
    return from(
      this.supabase.supabase
        .from('statut')
        .select('id, statut')
        .order('statut', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des statuts:', response.error);
          throw response.error;
        }
        console.log('Statuts récupérés depuis Supabase:', response.data);
        return (response.data as Statut[]) || [];
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
    console.log(`[DbConnectService] Récupération des détails du devis auto pour l'ID: ${devisId}`);
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
    console.log(`[DbConnectService] Récupération des détails du devis habitation pour l'ID: ${devisId}`);
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
    console.log(`[DbConnectService] Récupération des détails du devis obsèques pour l'ID: ${devisId}`);
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
        console.log(`[DbConnectService] Détails du devis obsèques reçus pour l'ID ${devisId}:`, response.data);
        return response.data;
      })
    );
  }

  /**
   * Récupère les détails complets d'une demande d'assurance voyage par son ID.
   * @param devisId L'ID de la demande à récupérer.
   * @returns Un Observable avec les détails de la demande.
   */
  getVoyageQuoteDetails(devisId: number): Observable<any> {
    return from(
      this.supabase.supabase
        .from('assu_voyage')
        .select('*')
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
   * Récupère les détails complets d'un devis d'assurance RC familiale par son ID.
   * @param devisId L'ID du devis à récupérer.
   * @returns Un Observable avec les détails du devis.
   */
  getRcQuoteDetails(devisId: number): Observable<any> {
    return from(
      this.supabase.supabase
        .from('rc_familiale_quotes')
        .select('*')
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

  /**
   * Récupère tous les devis d'assurance auto pour le tableau de bord de gestion.
   * @param searchTerm Le terme de recherche pour filtrer les résultats.
   * @param page La page actuelle pour la pagination.
   * @param itemsPerPage Le nombre d'éléments par page.
   * @returns Un Observable avec la liste des devis.
   */
  getAllAutoQuotes(searchTerm: string, page: number, itemsPerPage: number): Observable<{ data: any[], count: number | null }> {
    const rangeFrom = (page - 1) * itemsPerPage;
    const rangeTo = rangeFrom + itemsPerPage - 1;

    let query = this.supabase.supabase
      .from('devis_assurance')
      .select(`
          id,
          created_at,
          statut,
          preneur:personnes!devis_assurance_preneur_id_fkey ( nom, prenom ),
          vehicules ( type, marque, modele )
        `, { count: 'exact' }) // On demande le compte total
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo); // On applique la pagination

    // On applique le filtre si un terme de recherche est fourni
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      // Utilisation d'une syntaxe plus sûre pour le filtre .or()
      query = query.or(
        `marque.ilike.${searchPattern},modele.ilike.${searchPattern}`,
        { foreignTable: 'vehicules' }
      ).or(`nom.ilike.${searchPattern},prenom.ilike.${searchPattern}`, { foreignTable: 'personnes' });
    }

    return from(query).pipe(
      map(response => ({
        data: response.data || [],
        count: response.count
      }))
    );
  }

  /**
   * Récupère tous les devis d'assurance habitation pour le tableau de bord de gestion.
   * @param searchTerm Le terme de recherche pour filtrer les résultats.
   * @param page La page actuelle pour la pagination.
   * @param itemsPerPage Le nombre d'éléments par page.
   * @returns Un Observable avec la liste des devis.
   */
  getAllHabitationQuotes(searchTerm: string, page: number, itemsPerPage: number): Observable<{ data: any[], count: number | null }> {
    const rangeFrom = (page - 1) * itemsPerPage;
    const rangeTo = rangeFrom + itemsPerPage - 1;

    let query = this.supabase.supabase
      .from('habitation_quotes')
      .select(`
          id,
          created_at,
          statut,
          batiment_adresse,
          batiment_type_maison,
          preneur:personnes!habitation_quotes_preneur_id_fkey ( nom, prenom )
        `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      // Utilisation d'une syntaxe plus sûre pour le filtre .or()
      query = query.or(
        `batiment_adresse.ilike.${searchPattern}`
      ).or(`nom.ilike.${searchPattern},prenom.ilike.${searchPattern}`, { foreignTable: 'personnes' });
    }

    return from(query).pipe(
      map(response => ({
        data: response.data || [],
        count: response.count
      }))
    );
  }

  /**
   * Récupère tous les devis d'assurance obsèques pour le tableau de bord de gestion.
   * @returns Un Observable avec la liste des devis.
   */
  getAllObsequesQuotes(searchTerm: string, page: number, itemsPerPage: number): Observable<{ data: any[], count: number | null }> {
    const rangeFrom = (page - 1) * itemsPerPage;
    const rangeTo = rangeFrom + itemsPerPage - 1;

    let query = this.supabase.supabase
      .from('obseques_quotes')
      .select(`id, created_at, statut, nombre_assures, preneur:personnes!obseques_quotes_preneur_id_fkey ( nom, prenom )`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      // Utilisation d'une syntaxe plus sûre pour le filtre .or()
      query = query.or(
        `nom.ilike.${searchPattern},prenom.ilike.${searchPattern}`, { foreignTable: 'personnes' }
      );
    }

    return from(query).pipe(
      map(response => ({
        data: response.data || [],
        count: response.count
      }))
    );
  }

  /**
   * Récupère toutes les demandes d'assurance voyage pour le tableau de bord de gestion.
   * @returns Un Observable avec la liste des demandes.
   */
  getAllVoyageQuotes(): Observable<any[]> {
    return from(
      this.supabase.supabase
        .from('assu_voyage')
        .select(`
          id,
          date_created,
          statut,
          nom,
          prenom,
          description
        `)
        .order('date_created', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }

  /**
   * Récupère tous les devis d'assurance RC familiale pour le tableau de bord de gestion.
   * @returns Un Observable avec la liste des devis.
   */
  getAllRcQuotes(): Observable<any[]> {
    return from(
      this.supabase.supabase
        .from('rc_familiale_quotes')
        .select(`
          id,
          created_at,
          preneur_nom,
          preneur_prenom,
          risque
        `)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        // Note: La table rc_familiale_quotes n'a pas de colonne 'statut' pour le moment.
        return response.data || [];
      })
    );
  }

  /**
   * Récupère les devis d'assurance auto les plus récents pour le tableau de bord.
   * @param limit Le nombre de devis à récupérer.
   * @returns Un Observable avec la liste des devis récents.
   */
  getRecentAutoQuotes(limit: number): Observable<any[]> {
    return from(
      this.supabase.supabase
        .from('devis_assurance')
        .select(`
          id,
          created_at,
          statut,
          preneur:personnes!devis_assurance_preneur_id_fkey ( nom, prenom )
        `)
        .order('created_at', { ascending: false })
        .limit(limit) // Limite le nombre de résultats
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        console.log('[DbConnectService] Recent auto quotes fetched:', response.data);
        return response.data || [];
      })
    );
  }

  /**
   * Récupère les devis d'assurance habitation les plus récents pour le tableau de bord.
   * @param limit Le nombre de devis à récupérer.
   * @returns Un Observable avec la liste des devis récents.
   */
  getRecentHabitationQuotes(limit: number): Observable<any[]> {
    return from(
      this.supabase.supabase
        .from('habitation_quotes')
        .select(`
          id,
          created_at,
          statut,
          preneur:personnes!habitation_quotes_preneur_id_fkey ( nom, prenom )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des devis habitation récents:', response.error);
          throw response.error;
        }
        return response.data || [];
      })
    );
  }

  /**
   * Récupère les contrats d'assurance auto pour le tableau de bord de gestion.
   * @param limit Le nombre de contrats à récupérer.
   * @returns Un Observable avec la liste des contrats.
   */
  getAutoPolicies(limit: number): Observable<any[]> {
    return from(
      this.supabase.supabase
        .from('polices_auto') // Assurez-vous que le nom de la table est correct
        .select(`
          id,
          numero_police,
          date_debut,
          date_fin,
          statut,
          preneur:personnes ( nom, prenom )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      })
    );
  }

  /**
   * Récupère la liste de toutes les nationalités.
   * @returns Un Observable avec la liste des nationalités.
   */
  getNationalities(): Observable<Nationality[]> {
    return from(
      this.supabase.supabase
        .from('nationalities')
        .select('*')
        .order('nationality', { ascending: true }) // Ordonne les nationalités par ordre alphabétique
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des nationalités:', response.error);
          throw response.error;
        }
        return (response.data as Nationality[]) || [];
      })
    );
  }

  /**
   * @param type Le type de devis ('auto', 'habitation', 'obseques', 'voyage').
   * @param id L'ID du devis.
   * @returns Un Observable avec les Détails de l'offre.
   */
  getQuoteDetails(type: string, id: number): Observable<any> {
    switch (type) {
      case 'auto':
        return this.getDevisDetails(id);
      case 'habitation':
        return this.getHabitationQuoteDetails(id);
      case 'obseques':
        return this.getObsequesQuoteDetails(id); // Correction: retour direct de l'observable
      case 'voyage':
        return this.getVoyageQuoteDetails(id);
      case 'rc': // Ajout d'un cas distinct pour 'rc'
        return this.getRcQuoteDetails(id);
      default:
        console.error(`Type de devis inconnu dans getQuoteDetails: ${type}`);
        return of(null); // Retourne un observable de null pour les types inconnus.
    }
  }

  /**
   * Récupère la catégorie d'un devis en fonction de son ID en interrogeant une fonction SQL.
   * @param id L'ID du devis.
   * @returns Un Observable avec la catégorie du devis ('auto', 'habitation', etc.) ou null.
   */
  getQuoteCategoryById(id: number): Observable<string | null> {
    return from(
      this.supabase.supabase.rpc('get_quote_category_by_id', { p_quote_id: id })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération de la catégorie du devis:', response.error);
          throw response.error;
        }
        // La fonction RPC retourne un objet { category: '...' } ou null
        return response.data ? response.data : null;
      }),
      catchError(error => {
        console.error('Erreur dans le pipe de getQuoteCategoryById:', error);
        return of(null);
      })
    );
  }

  /**
   * Met à jour un devis d'assurance auto complet (preneur, conducteur, véhicule, garanties).
   * Cette méthode appelle une fonction RPC (Remote Procedure Call) dans Supabase
   * pour garantir que toutes les mises à jour sont effectuées de manière atomique.
   *
   * @param quoteId L'ID du devis à mettre à jour.
   * @param payload Les données du formulaire contenant les informations à jour.
   * @returns Un Observable qui émet la réponse de la fonction RPC.
   */
  updateAutoQuote(quoteId: number, payload: AutoQuoteUpdatePayload): Observable<{ success: boolean, error?: any, data?: any }> {
    // 1. Mapper les noms de champs du formulaire vers les noms de colonnes de la BDD
    const mapPersonData = (personForm: any) => ({
      prenom: personForm.firstName,
      nom: personForm.lastName,
      date_naissance: personForm.dateNaissance,
      email: personForm.email,
      telephone: personForm.phone,
      adresse: personForm.address,
      code_postal: personForm.postalCode,
      ville: personForm.city,
      permis_numero: personForm.driverLicenseNumber,
      permis_date: personForm.driverLicenseDate,
      numero_national: personForm.nationalRegistryNumber,
      idcard_number: personForm.idCardNumber,
      idcard_validity: personForm.idCardValidityDate,
      nationality: personForm.nationality,
      marital_status: personForm.maritalStatus
    });

    const rpcPayload = {
      p_quote_id: quoteId,
      p_preneur_data: mapPersonData(payload.p_preneur),
      p_conducteur_data: payload.p_conducteur ? mapPersonData(payload.p_conducteur) : null,
      p_vehicule_data: {
        marque: payload.p_vehicule['make'],
        modele: payload.p_vehicule['model'],
        annee: payload.p_vehicule['year'],
        plaque: payload.p_vehicule['licensePlate']
      },
      p_devis_data: payload.p_devis
    };

    // 2. Appeler la fonction RPC de Supabase
    const promise = this.supabase.supabase
      .rpc('update_auto_quote_details', rpcPayload)
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur RPC update_auto_quote_details:', error);
          return { success: false, error };
        }
        return { success: true, data };
      });

    return from(promise);
  }

  /**
   * Met à jour un devis d'assurance obsèques complet (preneur, assurés).
   * @param quoteId L'ID du devis à mettre à jour.
   * @param payload Les données du formulaire contenant les informations à jour.
   * @returns Un Observable qui émet la réponse de la fonction RPC.
   */
  updateObsequesQuote(quoteId: number, payload: ObsequesQuoteUpdatePayload): Observable<{ success: boolean, error?: any, data?: any }> {
    const mapPersonData = (personForm: any) => ({
      prenom: personForm.firstName,
      nom: personForm.lastName,
      date_naissance: personForm.dateNaissance,
      email: personForm.email,
      telephone: personForm.phone,
      adresse: personForm.address,
      code_postal: personForm.postalCode,
      ville: personForm.city,
      // Les autres champs ne sont pas pertinents pour le preneur obsèques
      permis_numero: null,
      permis_date: null,
      numero_national: null,
      idcard_number: null,
      idcard_validity: null,
      nationality: null,
      marital_status: null
    });

    const rpcPayload = {
      p_quote_id: quoteId,
      p_preneur_data: mapPersonData(payload.preneur),
      p_devis_data: payload.devis
    };

    const promise = this.supabase.supabase
      .rpc('update_obseques_quote_details', rpcPayload)
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur RPC update_obseques_quote_details:', error);
          return { success: false, error };
        }
        return { success: true, data };
      });

    return from(promise);
  }

  /**
   * Met à jour un devis d'assurance habitation complet.
   * @param quoteId L'ID du devis à mettre à jour.
   * @param payload Les données du formulaire contenant les informations à jour.
   * @returns Un Observable qui émet la réponse de la fonction RPC.
   */
  updateHabitationQuote(quoteId: number, payload: HabitationQuoteUpdatePayload): Observable<{ success: boolean, error?: any, data?: any }> {
    const mapPersonData = (personForm: any) => ({
      prenom: personForm.firstName,
      nom: personForm.lastName,
      date_naissance: personForm.dateNaissance,
      email: personForm.email,
      telephone: personForm.phone,
      adresse: personForm.address,
      code_postal: personForm.postalCode,
      ville: personForm.city,
      numero_national: personForm.nationalRegistryNumber,
      idcard_number: personForm.idCardNumber,
      idcard_validity: personForm.idCardValidityDate,
      nationality: personForm.nationality,
      marital_status: personForm.maritalStatus
    });

    // Mapper les données du devis pour correspondre aux attentes de la fonction RPC.
    const mapDevisData = (devisForm: any) => ({
      // Bâtiment
      adresse: devisForm.batiment_adresse,
      codePostal: devisForm.batiment_code_postal,
      ville: devisForm.batiment_ville,
      typeMaison: devisForm.batiment_type_maison,
      // Évaluation
      superficie: devisForm.evaluation_superficie,
      nombrePieces: devisForm.evaluation_nombre_pieces,
      loyerMensuel: devisForm.evaluation_loyer_mensuel,
      // Garanties
      contenu: devisForm.garantie_contenu,
      vol: devisForm.garantie_vol,
      pertesIndirectes: devisForm.garantie_pertes_indirectes,
      protectionJuridique: devisForm.garantie_protection_juridique,
      // Infos générales
      insuranceCompany: devisForm.compagnie_id,
      statut: devisForm.statut
    });

    const rpcPayload = {
      p_quote_id: quoteId,
      p_preneur_data: mapPersonData(payload.p_preneur),
      p_devis_data: mapDevisData(payload.p_devis)
    };

    const promise = this.supabase.supabase
      .rpc('update_habitation_quote_details', rpcPayload)
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur RPC update_habitation_quote_details:', error);
          return { success: false, error };
        }
        return { success: true, data };
      });

    return from(promise);
  }

  /**
   * Cherche une personne par email. Si elle n'existe pas, la crée.
   * @param personData Les données de la personne.
   * @returns Une promesse qui se résout avec les données de la personne trouvée ou créée.
   */
  private async findOrCreatePerson(personData: {
    email: string;
    genre?: string;
    nom?: string;
    prenom?: string;
    date_naissance?: string;
    telephone?: string;
    adresse?: string;
    code_postal?: string;
    ville?: string;
    permis_numero?: string;
    permis_date?: string;
  }): Promise<any> {
    // 1. Chercher la personne par email
    const { data: existingPerson } = await this.supabase.supabase
      .from('personnes')
      .select('*')
      .eq('email', personData.email)
      .single();

    if (existingPerson) {
      console.log('Personne existante trouvée:', existingPerson);
      return existingPerson;
    }

    // 2. Si elle n'existe pas, la créer
    console.log('Aucune personne existante, création en cours...');
    const { data: newPerson, error: insertError } = await this.supabase.supabase
      .from('personnes')
      .insert(personData)
      .select()
      .single();

    if (insertError) throw insertError;
    return newPerson;
  }

  /**
   * Récupère la liste de tous les sujets de contrat.
   * @returns Un Observable avec la liste des sujets.
   */
  getContractSubjects(): Observable<SubjectContract[]> {
    return from(
      this.supabase.supabase
        .from('subject_contract')
        .select('id, title')
        .order('title', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des sujets de contrat:', response.error);
          throw response.error;
        }
        return (response.data as SubjectContract[]) || [];
      })
    );
  }

  /**
   * Appelle la fonction (procédure stockée) sur Supabase pour obtenir
   * toutes les données d'un devis en un seul appel.
   * @param id L'ID du devis.
   * @returns Un Observable avec l'objet JSON complet du devis.
   */
  getFullQuoteDetails(id: number): Observable<any> {
    console.log(`[DbConnectService] Appel de getFullQuoteDetails pour l'ID: ${id}`);
    // Utilise la méthode rpc() du client Supabase pour appeler une fonction de la BDD
    const promise = this.supabase.supabase
      .rpc('get_full_quote_details', { p_quote_id: id }) // 1. Nom de la fonction, 2. Paramètres
      .then(({ data, error }) => {
        if (error) {
          console.error(`[DbConnectService] Erreur lors de l'appel RPC 'get_full_quote_details' pour l'ID ${id}:`, error);
          throw error;
        }

        console.log(`[DbConnectService] Données brutes reçues de la RPC pour l'ID ${id}:`, data);

        // La fonction retourne un seul objet JSON, qui est directement dans `data`.
        if (!data) {
          console.warn(`[DbConnectService] Aucun devis trouvé via RPC pour l'ID ${id}. La fonction a retourné null.`);
          throw new Error(`Aucun devis trouvé pour l'ID ${id}. La fonction a retourné une réponse vide.`);
        }

        console.log(`[DbConnectService] Succès: Détails complets du devis récupérés pour l'ID ${id}.`);
        return data;
      });

    return from(promise); // Convertit la promesse en Observable
  }

  /**
   * Récupère la liste de tous les statuts d'échéancier.
   * @returns Un Observable avec la liste des statuts.
   */
  getAllEcheanceStatuts(): Observable<EcheanceStatus[]> {
    return from(
      this.supabase.supabase
        .from('echeancier')
        .select('id, id_echeance, label')
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erreur lors de la récupération des statuts d\'échéancier:', response.error);
          throw response.error;
        }
        return (response.data as EcheanceStatus[]) || [];
      })
    );
  }

  /**
   * Enregistre les données JSON provenant d'un fichier CSV dans la base de données.
   * @param quoteId L'ID du devis associé.
   * @param quoteType Le type de devis associé.
   * @param data Les données JSON à enregistrer. 
   *        Le tableau 'data' doit contenir des objets représentant chaque ligne du CSV, 
   *        avec des clés correspondant aux colonnes du fichier CSV.
   *        Exemple : [{ col1: 'valeur1', col2: 'valeur2' }, ...]
   *        La table 'csv_imports' doit avoir au minimum les colonnes : 
   *        - quote_id (number)
   *        - quote_type (string)
   *        - json_data (JSON ou JSONB)
   * @returns Un Observable avec le résultat de l'insertion.
   */
  saveCsvDataToDb(quoteId: number, quoteType: string, data: any[]): Observable<any> {
    const cleanData = JSON.parse(JSON.stringify(data).replace(/\u0000/g, ''));
    const payload = {
      quote_id: quoteId,
      quote_type: quoteType,
      json_data: cleanData // La colonne 'json_data' doit être de type JSON ou JSONB dans Supabase
    };

    // 'csv_imports' est le nom de la table où les données seront stockées.
    // Vous devrez créer cette table dans votre base de données Supabase.
    return from(this.supabase.insertData('csv_imports', payload)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }
  /**
   * Récupère les données CSV via la procédure stockée
   */
  getCsvData(quoteId: number, quoteType: string): Observable<any[]> {

    // Appel de la fonction SQL 'get_csv_import_data'
    const request = this.supabase
      .supabase
      .rpc('get_csv_import_data', {
        p_quote_id: quoteId,
        p_quote_type: quoteType
      });

    return from(request).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        // response.data contient directement votre tableau JSON
        // S'il est vide (pas de résultat), on retourne un tableau vide pour éviter les bugs
        return response.data || [];
      })
    );
  }

  /**
   * Récupère la liste de tous les types de documents.
   * @returns Un Observable avec la liste des types de documents.
   */
  getDocumentTypes(): Observable<DocumentType[]> {
    return from(
      this.supabase.supabase
        .from('type_documents')
        .select('id, created_at, Label, view')
        .order('Label', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error(
            'Erreur lors de la récupération des types de documents :',
            error
          );
          throw error;
        }
        return data ?? [];
      })
    );
  }

  /**
   * Crée une URL signée pour un fichier dans Supabase Storage.
   * @param bucketName Le nom du bucket.
   * @param filePath Le chemin du fichier dans le bucket.
   * @param expiresIn La durée de validité de l'URL en secondes.
   * @returns Une promesse qui se résout avec l'URL signée.
   */
  public async createSignedUrl(bucketName: string, filePath: string, expiresIn: number): Promise<{ data: { signedUrl: string; } | null; error: Error | null; }> {
    // Note: l'accès se fait via this.supabase.supabase car votre service injecte SupabaseService
    return this.supabase.supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);
  }

  /**
   * Génère l'URL publique pour un fichier dans Supabase Storage.
   * @param bucketName Le nom du bucket.
   * @param filePath Le chemin du fichier dans le bucket.
   * @returns Un objet contenant l'URL publique.
   */
  public getPublicUrl(bucketName: string, filePath: string): { data: { publicUrl: string; }; } {
    // Note: l'accès se fait via this.supabase.supabase car votre service injecte SupabaseService
    return this.supabase.supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
  }
}
