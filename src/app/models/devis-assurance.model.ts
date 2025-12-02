/**
 * Représente la structure de la table 'devis_assurance' dans la base de données.
 */
export interface DevisAssurance {
  id: number;
  created_at?: string;
  preneur_id?: number | null;
  conducteur_id?: number | null;
  vehicule_id?: number | null;
  garantie_base_rc?: boolean | null;
  garantie_omnium_niveau?: 'non' | 'partiel' | 'total' | null;
  garantie_conducteur?: boolean | null;
  garantie_assistance?: boolean | null;
  date_effet?: string | null; // Format YYYY-MM-DD
  statut?: string | null;
  updated_at?: string;
  compagnie_id?: number | null;
}