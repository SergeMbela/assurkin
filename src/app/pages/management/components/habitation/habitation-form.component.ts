import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DbConnectService, Assureur, Statut } from '../../../../services/db-connect.service'; // Assurez-vous que le chemin est correct
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

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

  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  batimentCities$ = new BehaviorSubject<string[]>([]);
  preneurCities$!: Observable<string[]>;

  private destroy$ = new Subject<void>();

  constructor(
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();

    if (isPlatformBrowser(this.platformId)) {
      const batimentPostalCodeControl = this.parentForm.get('batiment.codePostal');
      if (batimentPostalCodeControl) {
        batimentPostalCodeControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(pc => (pc && pc.length >= 4) ? this.dbService.getCitiesByPostalCode(pc) : of([])),
          takeUntil(this.destroy$)
        ).subscribe(cities => {
          this.batimentCities$.next(cities);
          const cityControl = this.parentForm.get('batiment.ville');
          const currentCity = cityControl?.value;
          if (currentCity && !cities.includes(currentCity)) {
            cityControl.reset();
          }
        });
      }

      // Logique pour les villes du preneur d'assurance
      const preneurPostalCodeControl = this.parentForm.get('preneur.codePostal');
      if (preneurPostalCodeControl) {
        this.preneurCities$ = preneurPostalCodeControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(pc => {
            if (pc && pc.length >= 4) {
              return this.dbService.getCitiesByPostalCode(pc);
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