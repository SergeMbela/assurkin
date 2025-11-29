// src/app/models/dossier-assurance.model.ts

export interface InformationsGenerales {
  dateEffet?: Date;
  numeroPolice: string;
  codeCompagnie: string;
  intermediaire: string;
}

export interface PreneurAssurance {
  nomOfficiel: string;
  adresse: string; // Peut être parsé davantage si nécessaire
  dateNaissance?: Date;
  numeroNational?: string;
}

export interface IdentificationVehicule {
  dateImmatriculation?: Date;
  dateRadiation?: Date;
  dateMiseCirculation?: Date;
  numeroPlaque?: string;
  numeroChassis?: string;
  numeroPVG?: string; // Homologation
  codeDIV?: string;
  typePlaque?: string;
}

export interface CaracteristiquesTechniques {
  typeVehicule?: string;
  carburant: string; // Ex: 'Essence'
  couleur?: string;
  cylindree: number;
  puissance: number;
  poidsOperationnel: number;
  nombrePlacesAssises: number;
  nombrePlacesDebout: number;
}

// L'objet global qui regroupe tout
export interface DossierAssurance {
  informationsGenerales: InformationsGenerales;
  preneurAssurance: PreneurAssurance;
  identificationVehicule: IdentificationVehicule;
  caracteristiquesTechniques: CaracteristiquesTechniques;
}

/**
 * Dictionnaire pour mapper les clés de propriété de DossierAssurance
 * à des libellés "user-friendly" pour l'affichage.
 */
export const dossierAssuranceLabels: { [key: string]: string } = {
  // InformationsGenerales
  dateEffet: "Date d'effet",
  numeroPolice: "Numéro de Police",
  codeCompagnie: "Code Compagnie",
  intermediaire: "Intermédiaire",
  // PreneurAssurance
  nomOfficiel: "Nom du preneur",
  adresse: "Adresse",
  dateNaissance: "Date de Naissance",
  numeroNational: "Numéro National",
  // IdentificationVehicule
  dateImmatriculation: "Date 1ère Immat.",
  dateMiseCirculation: "Date 1ère Circ.",
  numeroPlaque: "Plaque",
  numeroChassis: "N° de Chassis",
  // CaracteristiquesTechniques
  carburant: "Carburant",
  puissance: "Puissance (kW)",
  cylindree: "Cylindrée (cm³)",
};