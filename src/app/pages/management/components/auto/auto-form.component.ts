import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, finalize, startWith, takeUntil, catchError } from 'rxjs';
import { DbConnectService, Marque, Assureur, Statut, Modele } from '../../../../services/db-connect.service';
import { LicensePlateFormatDirective } from '../../../../directives/license-plate-format.directive';

@Component({
  selector: 'app-auto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LicensePlateFormatDirective
  ],
  templateUrl: './auto-form.component.html',
})
export class AutoFormComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;
  @Input() showMainDriverSection: boolean = false;

  // Observables pour les listes déroulantes
  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  vehicleYears: number[] = [];
  preneurCities$!: Observable<string[]>;

  // Logique d'autocomplétion
  marqueCtrl = new FormControl('');
  filteredMarques$!: Observable<Marque[]>;
  isMarqueLoading = false;
  isModeleLoading = false;
  modelesForSelectedMarque: Modele[] = [];
  selectedMarqueId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    // Initialiser les données nécessaires
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1940; year--) {
      this.vehicleYears.push(year);
    }

    // Logique d'auto-complétion pour la marque
    if (isPlatformBrowser(this.platformId)) {
      this.filteredMarques$ = this.marqueCtrl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        tap(value => {
          if (!value || typeof value === 'string') {
            this.parentForm.get('vehicule.model')?.setValue('');
            this.modelesForSelectedMarque = [];
            this.selectedMarqueId = null;
          }
          this.isMarqueLoading = (typeof value === 'string' && value.length >= 2);
        }),
        switchMap(value => {
          const searchTerm = typeof value === 'string' ? value : '';
          if (searchTerm.length >= 2) {
            return this.dbService.searchMarques(searchTerm).pipe(finalize(() => this.isMarqueLoading = false));
          }
          return of([]);
        }),
        takeUntil(this.destroy$)
      );

      // Synchroniser avec le formulaire parent
      this.marqueCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
        this.parentForm.get('vehicule.make')?.setValue(value, { emitEvent: false });
      });

      // Logique pour récupérer les villes en fonction du code postal du preneur
      const preneurPostalCodeCtrl = this.parentForm.get('preneurAssurance.postalCode');
      if (preneurPostalCodeCtrl) {
        this.preneurCities$ = preneurPostalCodeCtrl.valueChanges.pipe(
          startWith(preneurPostalCodeCtrl.value || ''),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((postalCode: string) => {
            if (postalCode && postalCode.length >= 4) {
              // Assuming getCitiesByPostalCode exists on your dbService
              return this.dbService.getCitiesByPostalCode(postalCode).pipe(
                catchError(() => of([])) // Handle potential HTTP errors
              );
            }
            return of([]); // Return empty array if postal code is too short
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

  selectMarque(marque: Marque): void {
    this.marqueCtrl.setValue(marque.nom, { emitEvent: false });
    this.parentForm.get('vehicule.make')?.setValue(marque.nom);
    this.parentForm.get('vehicule.model')?.reset('');
    this.modelesForSelectedMarque = [];

    if (this.selectedMarqueId === marque.marque_id) {
      return; // Avoid reloading models if the same brand is selected
    }

    this.selectedMarqueId = marque.marque_id;
    this.isModeleLoading = true;

    this.dbService.searchModeles(this.selectedMarqueId).pipe(
      catchError(() => of([])), // On error, return an empty array to prevent breaking the flow
      finalize(() => this.isModeleLoading = false),
      takeUntil(this.destroy$)
    ).subscribe(modeles => this.modelesForSelectedMarque = modeles);
  }
}