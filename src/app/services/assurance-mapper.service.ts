import { Injectable } from '@angular/core';import { DossierAssurance } from '../pipes/dossier-assurance.model';

@Injectable({
  providedIn: 'root'
})
export class AssuranceMapperService {
  // Dictionnaire pour la traduction des en-têtes, utilisé par la méthode getFrenchTranslation
  private readonly headerTranslations: { [key: string]: string } = {
    'DTM+008': 'dateEffet',
    'RFF+001': 'numeroPolice',
    'PTY+006': 'codeCompagnie',
    'PTY+002': 'intermediaire',
    'NME+001': 'nomOfficiel',
    'ADR+002': 'adresse',
    'DTM+001': 'dateNaissance',
    'RFF+022': 'numeroNational',
    // ... Ajoutez toutes les autres traductions ici
  };

  constructor() { }

  /**
   * Transforme la chaîne brute (string) en objet DossierAssurance structuré
   */
  mapRawDataToDossier(rawData: string): DossierAssurance {
    return {
      informationsGenerales: {
        dateEffet: this.extractDate(rawData, 'DTM\\+008'),
        numeroPolice: this.extract(rawData, 'RFF\\+001'),
        codeCompagnie: this.extract(rawData, 'PTY\\+006'),
        intermediaire: this.extract(rawData, 'PTY\\+002')
      },
      preneurAssurance: {
        nomOfficiel: this.extract(rawData, 'NME\\+001'),
        adresse: this.extract(rawData, 'ADR\\+002'),
        dateNaissance: this.extractDate(rawData, 'DTM\\+001'),
        numeroNational: this.extract(rawData, 'RFF\\+022')
      },
      identificationVehicule: {
        dateImmatriculation: this.extractDate(rawData, 'DTM\\+134'),
        dateRadiation: this.extractDate(rawData, 'DTM\\+055'),
        dateMiseCirculation: this.extractDate(rawData, 'DTM\\+013'),
        numeroPlaque: this.extract(rawData, 'RFF\\+010'),
        numeroChassis: this.extract(rawData, 'RFF\\+011'),
        numeroPVG: this.extract(rawData, 'RFF\\+012'),
        codeDIV: this.extract(rawData, 'RFF\\+018'),
        typePlaque: this.extract(rawData, 'ATT\\+5008')
      },
      caracteristiquesTechniques: {
        typeVehicule: this.extract(rawData, 'ATT\\+5003'),
        carburant: this.mapCarburant(this.extract(rawData, 'ATT\\+5015')), // Mapping spécifique
        couleur: this.extract(rawData, 'ATT\\+5019'),
        cylindree: this.parseNumber(this.extract(rawData, 'QTY\\+003')),
        puissance: this.parseNumber(this.extract(rawData, 'QTY\\+004')),
        poidsOperationnel: this.parseNumber(this.extract(rawData, 'QTY\\+105')),
        nombrePlacesAssises: this.parseNumber(this.extract(rawData, 'QTY\\+002')),
        nombrePlacesDebout: this.parseNumber(this.extract(rawData, 'QTY\\+122'))
      }
    };
  }

  /**
   * Fonction utilitaire pour extraire la valeur basée sur le Code TAG.
   * Elle cherche le TAG, ignore la parenthèse (Label) et prend la valeur qui suit.
   */
  private extract(text: string, tagCode: string): string {
    // Regex expliquée :
    // 1. Chercher le code (ex: DTM+008)
    // 2. \s*\(.*?\) : Ignorer le libellé entre parenthèses (ex: (Aanvangsdatum))
    // 3. (.*?) : Capturer tout ce qui suit de manière non-gourmande...
    // 4. (?=([A-Z]{3}\+|$) : ...jusqu'à tomber sur le prochain TAG (3 lettres + un plus) OU la fin du texte
    // Le 's' flag (dotAll) permet au '.' de matcher aussi les nouvelles lignes.
    const regex = new RegExp(`${tagCode}\\s*\\(.*?\\)\\s*(.*?)(?=\\s*[A-Z]{3}\\+|$)`, 'is');
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : '';
  }

  /**
   * Fonction utilitaire pour extraire et convertir une date.
   * Gère le format 'DD-MM-YYYY'.
   */
  private extractDate(text: string, tagCode: string): Date | undefined {
    const dateStr = this.extract(text, tagCode);
    if (!dateStr) return undefined;
    const parts = dateStr.split('-');
    return parts.length === 3 ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])) : undefined;
  }

  // Convertit "01" en "Essence"
  private mapCarburant(code: string): string {
    const codeNettoye = code.replace('01', '').trim(); // Le code est parfois collé au texte
    if (code.includes('01')) return 'Essence';
    if (code.includes('02')) return 'Diesel';
    if (code.includes('03')) return 'LPG';
    if (code.includes('08')) return 'Électrique';
    if (code.includes('09')) return 'Hybride';
    return code;
  }

  // Sécurise la conversion en nombre
  private parseNumber(val: string): number {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Traduit un en-tête technique en son équivalent français.
   * @param header L'en-tête brut (ex: "DTM+008 (Aanvangsdatum)").
   * @returns La traduction française ou l'en-tête original si non trouvé.
   */
  getFrenchTranslation(header: string): string | undefined {
    const tagMatch = header.match(/^[A-Z]{3}\+\d+/);
    const tag = tagMatch ? tagMatch[0] : header;
    return this.headerTranslations[tag];
  }

}
