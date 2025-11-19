import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DbConnectService, Contrat } from '../../services/db-connect.service';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router, RouterLink } from '@angular/router';

// Interface pour les devis d'assurance auto
export interface DevisAuto {
  id: number;
  type: string; // Ajout du type de véhicule depuis le devis
  date_effet: string;
  categorie: string;
  valeur: number | null; // Ajout de la valeur depuis le devis
  vehicules: {
    marque: string;
    modele: string;
  };
  personnes: { // Le preneur
    email: string;
  };
}

@Component({
  selector: 'app-mydata',
  standalone: true,
  providers: [DbConnectService],
  imports: [CommonModule, RouterLink],
  templateUrl: './mydata.component.html',
})
export class MydataComponent implements OnInit, OnDestroy {
  user: User | null = null;
  loading = true;
  activeView: string = 'donnees';
  contracts: Contrat[] = [];
  contractsLoading = false;
  devisAuto: DevisAuto[] = [];
  devisLoading = false;
  devisHabitation: any[] = []; // You can create a specific interface for this

  private destroy$ = new Subject<void>();

  constructor(
    private dbConnectService: DbConnectService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Exécuter la récupération de l'utilisateur uniquement dans le navigateur
      this.dbConnectService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
        this.user = user;
        this.loading = false;
        if (user && user.id && user.email) {
          console.log('User data:', user);
          // Lier l'ID de l'utilisateur authentifié à l'enregistrement dans la table 'personnes'
          this.dbConnectService.linkUserToPerson(user.id, user.email)
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        }
      });
    } else {
      // Côté serveur, on ne charge pas l'utilisateur et on termine le chargement
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setView(view: string): void {
    this.activeView = view;
    if (view !== 'donnees' && this.user) {
      this.loadContracts(view);
    }
  }

  loadContracts(category: string): void {
    if (!this.user) {
      return; // Ne rien faire si l'utilisateur n'est pas connecté
    }
    this.contractsLoading = true;
    this.contracts = []; // Vider les contrats précédents
    this.dbConnectService.getContracts(this.user.id, category).pipe(takeUntil(this.destroy$)).subscribe(data => {
      console.log(`[mydata.component.ts] Contrats pour la catégorie '${category}':`, data);
      this.contracts = data;
      this.contractsLoading = false;
    });
  }

  loadDevisAuto(): void {
    if (!this.user) {
      return;
    }
    this.devisLoading = true;
    this.devisAuto = [];
    // Note: getDevisAuto est une nouvelle méthode à créer dans DbConnectService
    this.dbConnectService.getDevisAuto(this.user.id).pipe(takeUntil(this.destroy$)).subscribe((data: DevisAuto[]) => {
      this.devisAuto = data;
      this.devisLoading = false;
    });
  }

  loadDevisHabitation(): void {
    if (!this.user) {
      return;
    }
    this.devisLoading = true;
    this.devisHabitation = [];
    this.dbConnectService.getContracts(this.user.id, 'habitation').pipe(takeUntil(this.destroy$)).subscribe((data: any[]) => {
      this.devisHabitation = data;
      console.log('Devis Habitation data:', data);
      this.devisLoading = false;
    });
  }

  async logout(): Promise<void> {
    try {
      await lastValueFrom(this.authService.signOut());
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  }
}