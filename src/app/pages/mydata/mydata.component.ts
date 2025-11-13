import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DbConnectService, Contrat } from '../../services/db-connect.service';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mydata',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mydata.component.html',
})
export class MydataComponent implements OnInit, OnDestroy {
  user: User | null = null;
  loading = true;
  activeView: string = 'donnees';
  contracts: Contrat[] = [];
  contractsLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private dbConnectService: DbConnectService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    // Seulement récupérer les données utilisateur dans le navigateur
    if (isPlatformBrowser(this.platformId)) {
      this.dbConnectService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
        this.user = user;
        this.loading = false;
        if (user) {
          console.log('User data:', user);
        }
      });
    } else {
      // Pour le SSR, on suppose qu'il n'y a pas d'utilisateur initialement
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.destroy$.next();
      this.destroy$.complete();
    }
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
      this.contracts = data;
      this.contractsLoading = false;
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