import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AutoFormData {
  // Define the properties you expect for the auto form
  // Example:
  name: string;
  email: string;
  vehicleType: 'car' | 'motorcycle';
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export interface HabitationFormData {
  // Define properties for Habitation form
  // Example: address: string;
}

export interface RcFormData {
  // Define properties for RC form
}

export interface ObsequesFormData {
  // Define properties for Obseques form
}

export interface InfoRequestFormData {
  // Define properties for Info Request form
}

@Injectable({
  providedIn: 'root'
})
export class DbConnectService {

  private apiUrl = environment.dbConnect;

  constructor(private http: HttpClient) { }

  /**
   * Enregistre les données du formulaire de contact général.
   * @param formData Les données du formulaire.
   * @returns Un Observable de la réponse HTTP.
   */
  saveContactForm(formData: ContactFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contact`, formData);
  }

  /**
   * Enregistre les données du formulaire d'assurance auto.
   * @param formData Les données du formulaire.
   * @returns Un Observable de la réponse HTTP.
   */
  saveAutoForm(formData: AutoFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auto`, formData);
  }

  /**
   * Enregistre les données du formulaire d'assurance habitation.
   * @param formData Les données du formulaire.
   * @returns Un Observable de la réponse HTTP.
   */
  saveHabitationForm(formData: HabitationFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/habitation`, formData);
  }

  /**
   * Enregistre les données du formulaire d'assurance RC familiale.
   * @param formData Les données du formulaire.
   * @returns Un Observable de la réponse HTTP.
   */
  saveRcForm(formData: RcFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rc-familiale`, formData);
  }

  /**
   * Enregistre les données du formulaire d'assurance obsèques.
   * @param formData Les données du formulaire.
   * @returns Un Observable de la réponse HTTP.
   */
  saveObsequesForm(formData: ObsequesFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/obseques`, formData);
  }

  /**
   * Enregistre les données du formulaire d'assurance voyage et juridique.
   * @param formData Les données du formulaire.
   * @param type 'voyage' ou 'juridique'
   * @returns Un Observable de la réponse HTTP.
   */
  saveInfoRequestForm(formData: InfoRequestFormData, type: 'voyage' | 'juridique'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${type}`, formData);
  }
}