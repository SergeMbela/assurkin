import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DbConnectService, Assureur, Statut } from '../../../../services/db-connect.service'; // Assurez-vous que le chemin est correct
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, startWith, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-habitation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './habitation-form.component.html',
})
export class HabitationFormComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;
  @Input() isReadOnly: boolean = true;

  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  batimentCities$: Observable<string[]>;
  preneurCities$!: Observable<string[]>;

  private destroy$ = new Subject<void>();

  constructor(
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.batimentCities$ = of([]); // Initialisation
  }

  ngOnInit(): void {
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();

    if (isPlatformBrowser(this.platformId)) {
      const batimentPostalCodeControl = this.parentForm.get('batiment.codePostal');
      if (batimentPostalCodeControl) {
        this.batimentCities$ = batimentPostalCodeControl.valueChanges.pipe(
          startWith(batimentPostalCodeControl.value || ''),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(pc => {
            if (pc && pc.length >= 4) {
              return this.dbService.getCitiesByPostalCode(pc).pipe(
                catchError(() => of([])), // En cas d'erreur, retourne un tableau vide
                takeUntil(this.destroy$)
              );
            }
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      }

      // Logique pour les villes du preneur d'assurance
      const preneurPostalCodeControl = this.parentForm.get('preneurAssurance.codePostal');
      if (preneurPostalCodeControl) {
        this.preneurCities$ = preneurPostalCodeControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(pc => {
            if (pc && pc.length >= 4) {
              return this.dbService.getCitiesByPostalCode(pc).pipe(
                catchError(() => of([])), // En cas d'erreur, retourne un tableau vide
                takeUntil(this.destroy$)
              );
            }
            return of([]);
          }),
          takeUntil(this.destroy$)
        );
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}