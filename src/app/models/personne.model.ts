/**
 * Représente la structure de la table 'personnes' dans la base de données.
 * Chaque propriété est optionnelle (?) car toutes les colonnes de la DB sont nullables,
 * à l'exception de 'id'.
 */
export interface Personne {
  id: number;
  created_at?: string;
  genre?: 'Madame' | 'Monsieur' | 'Autre' | null;
  nom?: string | null;
  prenom?: string | null;
  date_naissance?: string | null; // Format YYYY-MM-DD
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  permis_numero?: string | null;
  permis_date?: string | null; // Format YYYY-MM-DD
  numero_national?: string | null;
  user_id?: string | null;
  updated_at?: string;
  nationality?: string | null;
  marital_status_id?: number | null;
  uid?: string | null; // UUID
}