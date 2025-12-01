import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { DbConnectService, Statut, Assureur } from '../../../../services/db-connect.service';

@Component({
  selector: 'app-obseques-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './obseques-form.component.html',
})
export class ObsequesFormComponent implements OnInit, OnDestroy {
  @Input() parentForm!: FormGroup;

  statuts$!: Observable<Statut[]>;
  insuranceCompanies$!: Observable<Assureur[]>;
  obsequesCities$ = new BehaviorSubject<string[]>([]);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dbService: DbConnectService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.statuts$ = this.dbService.getAllStatuts();
    this.insuranceCompanies$ = this.dbService.getAllAssureurs();

    if (isPlatformBrowser(this.platformId)) {
      this.parentForm.get('preneurObseques.postalCode')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(pc => pc && pc.length >= 4 ? this.dbService.getCitiesByPostalCode(pc) : of([])),
        takeUntil(this.destroy$)
      ).subscribe(cities => this.obsequesCities$.next(cities));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get assures(): FormArray {
    return this.parentForm.get('assures.assures') as FormArray;
  }

  createAssureFormGroup(assure: any = {}): FormGroup {
    return this.fb.group({
      nom: [assure.nom || ''],
      prenom: [assure.prenom || ''],
      dateNaissance: [assure.dateNaissance || ''],
      capital: [assure.capital || 0]
    });
  }

  addAssure(): void {
    if (this.assures) {
      this.assures.push(this.createAssureFormGroup());
    }
  }

  removeAssure(index: number): void {
    if (this.assures) {
      this.assures.removeAt(index);
    }
  }
}