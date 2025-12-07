import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DbConnectService, Person, Nationality } from '../../../../services/db-connect.service';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { PhoneNumberMaskDirective } from '../../../../directives/phone-number-mask.directive';
import { formatBelgianPhoneNumber } from '../../../../directives/phone-number.utils';
import { belgianNationalNumberValidator, nationalNumberBirthDateValidator } from '../../management.component'; // Import validators from parent

@Component({
  selector: 'app-person-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneNumberMaskDirective],
  templateUrl: './person-edit-modal.component.html',
  styleUrls: ['./person-edit-modal.component.css'],
})
export class PersonEditModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() personForm!: FormGroup; // This form is managed by the parent
  @Input() selectedPerson: Person | null = null; // Data for the person being edited
  @Input() quoteId: number | null = null;
  @Input() quoteType: string | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() savePerson = new EventEmitter<void>();

  private principalConducteurId: number | null = null; // Store the ID of the principal driver
  showPrincipalDriverSection: boolean = false; // Controls the collapse state

  // Inputs for dynamic fields, passed from parent
  @Input() citiesForPostalCode$: Observable<string[]> = of([]);
  @Input() nationalities$: Observable<Nationality[]> = of([]);
  @Input() isCitiesLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  @Input() isNationalitiesLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private fb: FormBuilder, private dbConnectService: DbConnectService) {}

  ngOnInit(): void {
    // The personForm is expected to be passed from the parent.
    // If it's not, it means the parent isn't managing it, so we initialize a basic one.
    // However, for this scenario, the parent (management.component.ts) *is* managing it.
    // So this block might not be strictly necessary if the parent always passes a form.
    if (!this.personForm) {
      this.personForm = this.fb.group({
        id: [''],
        prenom: ['', Validators.required],
        nom: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        telephone: [''], // Will be formatted by directive
        adresse: [''],
        code_postal: [''],
        ville: [''],
        numero_national: ['', belgianNationalNumberValidator()],
        date_naissance: [''],
        idcard_number: [''],
        idcard_validity: [''],
        nationality: [''],
        permis_numero: [''],
        permis_date: [''],
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.selectedPerson) {
      this.patchFormWithPersonData(this.selectedPerson);
      this.checkAndAddPrincipalConducteur(); // Check when modal opens
    }
    if (changes['selectedPerson'] && this.selectedPerson && this.isOpen) {
      this.patchFormWithPersonData(this.selectedPerson);
      this.checkAndAddPrincipalConducteur(); // Re-check if person data changes
    }
    if ((changes['quoteId'] || changes['quoteType']) && this.isOpen) {
      this.checkAndAddPrincipalConducteur(); // Re-check if quote context changes
    }
  }

  private formatDate(dateString: string | undefined | null): string | null {
    if (!dateString) return null;
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  }

  private patchFormWithPersonData(person: Person): void {
    this.personForm.patchValue({
      id: person.id,
      prenom: person.prenom,
      nom: person.nom,
      email: person.email,
      telephone: person.telephone ? formatBelgianPhoneNumber(person.telephone) : '', // Format phone number
      adresse: person.adresse,
      code_postal: person.code_postal,
      ville: person.ville,
      numero_national: person.numero_national,
      date_naissance: this.formatDate(person.date_naissance),
      idcard_number: person.idcard_number,
      idcard_validity: this.formatDate(person.idcard_validity),
      nationality: person.nationality, // Patch nationality ID
      permis_numero: person.permis_numero,
      permis_date: this.formatDate(person.permis_date),
    });
    // Remove principal_conducteur if it exists, to ensure a clean state before re-adding
    if (this.personForm.get('principal_conducteur')) {
      this.personForm.removeControl('principal_conducteur');
    }
  }

  private checkAndAddPrincipalConducteur(): void {
    if (this.quoteType === 'auto' && this.quoteId !== null) {
      this.showPrincipalDriverSection = false; // Hide by default until confirmed
      this.dbConnectService.getDevisDetails(this.quoteId).subscribe({
        next: (devisDetails) => {
          if (devisDetails && devisDetails.preneur && devisDetails.conducteur) {
            // Check if preneur_id is different from conducteur_id
            // Note: devisDetails.preneur.id and devisDetails.conducteur.id are numbers
            if (devisDetails.preneur.id !== devisDetails.conducteur.id) {
              this.principalConducteurId = devisDetails.conducteur.id; // Store the ID
              // Add principal_conducteur FormGroup if it doesn't exist
              if (!this.personForm.get('principal_conducteur')) {
                this.personForm.addControl(
                  'principal_conducteur',
                  this.fb.group({
                    id: [this.principalConducteurId], // Add ID to the form group
                    prenom: [devisDetails.conducteur.prenom || '', Validators.required],
                    nom: [devisDetails.conducteur.nom || '', Validators.required],
                    date_naissance: [devisDetails.conducteur.date_naissance || ''],
                    permis_numero: [devisDetails.conducteur.permis_numero || ''],
                    permis_date: [devisDetails.conducteur.permis_date || ''],
                  })
                );
              } else {
                // If it exists, just patch its value
                this.personForm.get('principal_conducteur')?.patchValue({
                  id: this.principalConducteurId, // Patch ID as well
                  prenom: devisDetails.conducteur.prenom || '',
                  nom: devisDetails.conducteur.nom || '',
                  date_naissance: devisDetails.conducteur.date_naissance || '',
                  permis_numero: devisDetails.conducteur.permis_numero || '',
                  permis_date: devisDetails.conducteur.permis_date || '',
                });
              }
            } else {
              // If preneur and conducteur are the same, remove the principal_conducteur FormGroup
              this.principalConducteurId = null; // Reset ID
              if (this.personForm.get('principal_conducteur')) {
                this.personForm.removeControl('principal_conducteur');
              }
            }
          }
        },
        error: (err) => {
          console.error('Error fetching devis details:', err);
          this.principalConducteurId = null; // Reset ID on error
          // Ensure principal_conducteur is removed on error to avoid displaying incomplete data
          if (this.personForm.get('principal_conducteur')) {
            this.personForm.removeControl('principal_conducteur');
          }
        },
      });
    } else {
      // If not an auto quote or no quoteId, ensure principal_conducteur is removed
      this.principalConducteurId = null; // Reset ID
      if (this.personForm.get('principal_conducteur')) {
        this.personForm.removeControl('principal_conducteur');
      }
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSave(): void {
    if (this.personForm.invalid) {
      this.personForm.markAllAsTouched();
      console.error('Form is invalid:', this.personForm.errors);
      return;
    }

    const mainPersonData = { ...this.personForm.value };
    delete mainPersonData.principal_conducteur; // Remove nested group before updating main person

    // Update the main person (selectedPerson)
    this.dbConnectService.updatePerson(mainPersonData.id, mainPersonData).subscribe({
      next: () => {
        console.log('Main person updated successfully!');
        // If there's a principal driver, update them too
        const principalConducteurFormGroup = this.personForm.get('principal_conducteur') as FormGroup;
        if (principalConducteurFormGroup && this.principalConducteurId) {
          const principalConducteurData = principalConducteurFormGroup.value;
          this.dbConnectService.updatePerson(this.principalConducteurId, principalConducteurData).subscribe({
            next: () => {
              console.log('Principal conducteur updated successfully!');
              this.savePerson.emit(); // Emit after all updates are done
            },
            error: (err) => console.error('Error updating principal conducteur:', err),
          });
        } else {
          this.savePerson.emit(); // Emit if only main person was updated
        }
      },
      error: (err) => console.error('Error updating main person:', err),
    });
  }
}