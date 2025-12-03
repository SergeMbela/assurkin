import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, of, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, takeUntil, catchError } from 'rxjs/operators';
import { DbConnectService, Marque, Assureur, Statut, Modele, MaritalStatus } from '../../../../services/db-connect.service';

@Component({
  selector: 'app-auto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './auto-form.component.html',
})
export class AutoFormComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;
  @Input() showMainDriverSection: boolean = false;
  @Input() marqueCtrl!: FormControl;
  @Input() filteredMarques$!: Observable<Marque[]>;
  @Input() isMarqueLoading: boolean = false;
  @Input() isModeleLoading: boolean = false;
  @Input() modelesForSelectedMarque: Modele[] = [];
  @Input() selectMarque!: (marque: Marque) => void;

  // Observables pour les listes déroulantes
  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  vehicleYears: number[] = [];
  @Input() preneurCities$!: BehaviorSubject<string[]>;
  nationalities$!: Observable<any[]>;
  maritalStatuses$!: Observable<MaritalStatus[]>;

  // Pour les villes du conducteur principal (si nécessaire)
  @Input() conducteurCities$!: BehaviorSubject<string[]>;


  private destroy$ = new Subject<void>();

  constructor(
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    // Initialiser les données nécessaires
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();
    this.nationalities$ = this.dbService.getNationalities();
    this.maritalStatuses$ = this.dbService.getAllMaritalStatuses();
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1940; year--) {
      this.vehicleYears.push(year);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}