import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, finalize, startWith, takeUntil } from 'rxjs/operators';
import { DbConnectService, Marque, Assureur, Statut } from '../../services/db-connect.service';
import { LicensePlateFormatDirective } from '../../directives/license-plate-format.directive';

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

  // Logique d'autocomplétion
  marqueCtrl = new FormControl('');
  filteredMarques$!: Observable<Marque[]>;
  isMarqueLoading = false;
  isModeleLoading = false;
  modelesForSelectedMarque: any[] = [];
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
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectMarque(marque: Marque): void {
    this.selectedMarqueId = marque.marque_id;
    this.marqueCtrl.setValue(marque.nom, { emitEvent: false }); // Mettre à jour le champ de saisie
    this.parentForm.get('vehicule.make')?.setValue(marque.nom); // Mettre à jour le formulaire principal
    this.parentForm.get('vehicule.model')?.reset('');
    this.modelesForSelectedMarque = [];
    this.isModeleLoading = true;
    this.dbService.searchModeles(this.selectedMarqueId).pipe(finalize(() => this.isModeleLoading = false)).subscribe(modeles => {
      this.modelesForSelectedMarque = modeles;
    });
  }
}