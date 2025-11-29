// src/app/models/dossier-assurance.model.ts

export interface InformationsGenerales {
  dateEffet: string; // ou Date si vous préférez gérer des objets Date
  numeroPolice: string;
  codeCompagnie: string;
  intermediaire: string;
}

export interface PreneurAssurance {
  nomOfficiel: string;
  adresse: string; // Peut être parsé davantage si nécessaire
  dateNaissance?: string;
  numeroNational?: string;
}

export interface IdentificationVehicule {
  dateImmatriculation?: string;
  dateRadiation?: string;
  dateMiseCirculation?: string;
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