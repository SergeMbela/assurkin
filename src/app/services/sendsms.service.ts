import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SendsmsService {

  constructor() { }

  async sendSms(to: string, message: string): Promise<any> {
    // S'assure que le numéro est au format international en ajoutant '+' si nécessaire.
    let formattedTo = to.trim(); // Enlève les espaces au début/fin
    if (!formattedTo.startsWith('+')) {
      formattedTo = `+${formattedTo}`;
    }

    console.log(`[SendsmsService] Tentative d'envoi du SMS au numéro : ${to}`);

    const functionUrl = `${environment.supabaseUrl}/functions/v1/send-sms`;


    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${environment.supabaseKey}`
        },
        body: JSON.stringify({ to: formattedTo, message })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur de la fonction Edge:', errorData);
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
      throw error;
    }
  }
}
