export interface DevisAuto {
  id: number;
  date_effet: string;
  vehicules: {
    marque: string;
    modele: string;
  };
  personnes: {
    user_id: string;
  };
}