import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
}

@Injectable({
  providedIn: 'root'
})
export class MailService {
  private functionUrl = `${environment.supabaseUrl}/functions/v1/send-email`;

  constructor(private http: HttpClient) { }

  sendEmail(data: EmailData): Observable<any> {
    const headers = {
      'Authorization': `Bearer ${environment.supabaseKey}`,
      'apikey': environment.supabaseKey,
      'Content-Type': 'application/json'
    };

    // Nous utilisons from(fetch(...)) pour être cohérent avec l'envoi de SMS et gérer la promesse
    return from(fetch(this.functionUrl, { method: 'POST', headers: headers, body: JSON.stringify(data) }));
  }
}