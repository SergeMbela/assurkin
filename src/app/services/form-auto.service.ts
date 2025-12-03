import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DbConnectService } from './db-connect.service';

@Injectable({
  providedIn: 'root'
})
export class FormAutoService {

  constructor(private fb: FormBuilder, private dbConnectService: DbConnectService) { }

  public buildForm(): FormGroup {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return this.fb.group({
      preneur: this.fb.group({
        genre: ['Madame', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        date_naissance: ['', [Validators.required, this.ageValidator(14)]],
        telephone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        adresse: ['', Validators.required],
        codePostal: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
        ville: ['', Validators.required],
        permis: ['', Validators.required],
        datePermis: ['', [Validators.required, this.dateInPastValidator()]],
      }),
      conducteurDifferent: [false],
      conducteur: this.fb.group({
        genre: ['Madame'],
        nom: [''],
        prenom: [''],
        date_naissance: ['', this.ageValidator(14)],
        adresse: [''],
        codePostal: ['', Validators.pattern('^[0-9]{4}$')],
        ville: [''],
        permis: [''],
        datePermis: ['', this.dateInPastValidator()],
      }),
      vehicule: this.fb.group({
        type: ['', Validators.required],
        marque: ['', Validators.required],
        modele: ['', Validators.required],
        puissance: ['', Validators.required],
        places: ['', Validators.required],
        dateCirculation: ['', [Validators.required, this.dateInPastValidator()]],
        valeur: [''],
      }),
      garanties: this.fb.group({
        base: [true],
        omnium: ['non'],
        conducteur: [false],
        assistance: [false]
      }),
      dateEffet: [minDate, Validators.required],
    });
  }

  public ageValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge ? null : { 'minAge': { requiredAge: minAge, actualAge: age } };
    };
  }

  public dateInPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate < today ? null : { 'dateNotInPast': true };
    };
  }

  public permisExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      return this.dbConnectService.checkPermisExists(control.value).pipe(
        map(exists => (exists ? { permisExists: true } : null)),
        catchError(() => of(null))
      );
    };
  }

  public emailExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      return this.dbConnectService.checkEmailExists(control.value).pipe(
        map(exists => (exists ? { emailExists: true } : null)),
        catchError(() => of(null))
      );
    };
  }
}