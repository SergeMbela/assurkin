import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, of, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { DbConnectService, Statut, Assureur } from '../../services/db-connect.service';

@Component({
  selector: 'app-habitation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './habitation-form.component.html',
})
export class HabitationFormComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;

  // Observables pour les listes déroulantes
  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  nationalities$!: Observable<any[]>;

  // Logique pour les villes
  preneurCities$ = new BehaviorSubject<string[]>([]);
  batimentCities$ = new BehaviorSubject<string[]>([]);

  private destroy$ = new Subject<void>();

  constructor(
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();
    this.nationalities$ = this.dbService.getNationalities();

    if (isPlatformBrowser(this.platformId)) {
      // Logique pour les villes du preneur
      this.parentForm.get('preneurAssurance.postalCode')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(pc => pc && pc.length >= 4 ? this.dbService.getCitiesByPostalCode(pc) : of([])),
        takeUntil(this.destroy$)
      ).subscribe(cities => this.preneurCities$.next(cities));

      // Logique pour les villes du bâtiment
      this.parentForm.get('batiment.codePostal')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(pc => pc && pc.length >= 4 ? this.dbService.getCitiesByPostalCode(pc) : of([])),
        takeUntil(this.destroy$)
      ).subscribe(cities => this.batimentCities$.next(cities));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}