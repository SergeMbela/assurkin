import { Injectable } from '@angular/core';
import * as Papa from 'papaparse';

@Injectable({
  providedIn: 'root'
})
export class ImatService {

  constructor() { }

  /**
   * Converts a CSV string to an array of JSON objects.
   * @param csv The string content of the CSV file.
   * @param delimiter The character used to separate columns. Defaults to ','.
   * @returns An array of objects.
   */
  public csvToJSON<T>(csv: string, delimiter: string = ','): T[] {
    const parseResult = Papa.parse(csv, {
      header: true,       // Traite la première ligne comme des en-têtes
      skipEmptyLines: true, // Ignore les lignes vides
      delimiter: delimiter, // Utilise le délimiteur fourni
      dynamicTyping: true,  // Tente de convertir les nombres et booléens
    });

    if (parseResult.errors.length > 0) {
      console.error('Erreurs de parsing CSV:', parseResult.errors);
    }

    return parseResult.data as T[];
  }
}
