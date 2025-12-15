import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mentions-legales.component.html',
  styleUrl: './mentions-legales.component.css'
})
export class MentionsLegalesComponent implements OnInit {
  email: string = 'info@assurkin.be';
  activeTab: string = 'vue-ensemble';
  email_ombudsman: string = (environment as any).email_ombudsman || 'info@ombudsman-insurance.be';
  url_ombudsman: string = (environment as any).url_ombudsman || 'www.ombudsman-insurance.be';


  loading: boolean = true;
  content: any = {};
  mifidContent: SafeHtml = '';

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.loadMentionsLegales();
  }

  async loadMentionsLegales() {
    try {
      const data: any = await firstValueFrom(this.http.get('assets/data/mentions-legales.json'));
      this.content = data;
      
      let mifid = data.mifid || '';
      // Remplacement des sauts de ligne et des variables
      mifid = mifid.replace(/\n/g, '<br>');
      mifid = mifid.replace(/{{email_ombudsman}}/g, this.email_ombudsman);
      mifid = mifid.replace(/{{url_ombudsman}}/g, this.url_ombudsman);
      
      this.mifidContent = this.sanitizer.bypassSecurityTrustHtml(mifid);
    } catch (e) {
      console.error('Erreur lors du chargement des mentions légales', e);
    } finally {
      this.loading = false;
    }
  }
}
