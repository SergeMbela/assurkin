import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, of, lastValueFrom } from 'rxjs';
import { takeUntil, tap, switchMap, catchError } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';

import { AuthService } from '../../services/auth.service';
import { DbConnectService, Person } from '../../services/db-connect.service';

@Component({
  selector: 'app-mydata',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mydata.component.html',
})
export class MydataComponent implements OnInit, OnDestroy {
  user: User | null = null;
  person: Person | null = null;
  loading = true;
  activeView: string = 'donnees';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dbConnectService: DbConnectService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.currentUser$
        .pipe(
          takeUntil(this.destroy$),
          tap(() => (this.loading = true)),
          switchMap((user) => {
            this.user = user;
            if (user && user.id && user.email) {
              // Lier l'utilisateur à son profil 'personne' et récupérer les données
              return this.dbConnectService.linkUserToPerson(user.id, user.email).pipe(
                switchMap(() => this.dbConnectService.getPersonByUserId(user.id)),
                catchError((err) => {
                  console.error('Erreur lors de la récupération du profil:', err);
                  return of(null);
                })
              );
            }
            return of(null);
          })
        )
        .subscribe((person) => {
          this.person = person;
          this.loading = false;
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setView(view: string) {
    this.activeView = view;
  }

  async logout(): Promise<void> {
    try {
      await lastValueFrom(this.authService.signOut());
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}