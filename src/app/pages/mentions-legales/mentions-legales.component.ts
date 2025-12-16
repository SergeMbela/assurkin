import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  errorMessage: string = '';
  mifidContent: SafeHtml = '';
  private static cachedData: any = null;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMentionsLegales();
    }
  }

  async loadMentionsLegales() {
    this.loading = true;
    this.errorMessage = '';
    try {
      let data: any;
      if (MentionsLegalesComponent.cachedData) {
        data = MentionsLegalesComponent.cachedData;
      } else {
        data = await firstValueFrom(this.http.get('/assets/data/mifid.json'));
        MentionsLegalesComponent.cachedData = data;
      }
      this.content = data;
      
      let mifid = data?.mifid || '';
      // Remplacement des sauts de ligne et des variables
      mifid = mifid.replace(/\n/g, '<br>');
      mifid = mifid.replace(/{{email_ombudsman}}/g, this.email_ombudsman);
      mifid = mifid.replace(/{{url_ombudsman}}/g, this.url_ombudsman);
      
      this.mifidContent = this.sanitizer.bypassSecurityTrustHtml(mifid);
    } catch (e: any) {
      console.error('Erreur lors du chargement des mentions légales', e);
      if (e instanceof HttpErrorResponse) {
        console.warn(`URL demandée en échec : ${e.url}`);
        if (e.status === 404) {
          this.errorMessage = "Le fichier de contenu est introuvable.";
        } else {
          this.errorMessage = `Impossible de charger le contenu (Erreur ${e.status}).`;
        }
      } else {
        this.errorMessage = "Une erreur inattendue est survenue lors du chargement.";
      }
    } finally {
      this.loading = false;
    }
  }
}
