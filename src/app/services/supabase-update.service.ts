import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface AutoQuoteUpdatePayload {
  preneur: { [key: string]: any };
  conducteur?: { [key: string]: any };
  vehicule: { [key: string]: any };
  devis: {
    garantie_base_rc: boolean;
    garantie_omnium_niveau: string;
    garantie_conducteur: boolean;
    garantie_assistance: boolean;
    date_effet: string;
    compagnie_id?: number | null;
  };
}

export interface ObsequesQuoteUpdatePayload {
  preneur: { [key: string]: any };
  devis: {
    preneur_est_assure: boolean;
    assures: any[];
    nombre_assures: number;
    compagnie_id?: number | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseUpdateService {
  private supabase = inject(SupabaseService);

  constructor() {}

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
      p_preneur_data: mapPersonData(payload.preneur),
      p_conducteur_data: payload.conducteur ? mapPersonData(payload.conducteur) : null,
      p_vehicule_data: {
        marque: payload.vehicule['make'],
        modele: payload.vehicule['model'],
        annee: payload.vehicule['year'],
        plaque: payload.vehicule['licensePlate']
      },
      p_devis_data: payload.devis
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
          console.warn(
            `[SupabaseUpdateService] Erreur 500 probable dans 'updateObsequesQuote' pour l'ID ${quoteId}.`,
            'Erreur RPC Supabase:',
            error
          );
          console.error('Erreur RPC update_obseques_quote_details:', error);
          return { success: false, error };
        }
        return { success: true, data };
      });

    return from(promise);
  }
}
