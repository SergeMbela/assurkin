import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-obseques',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './obseques.component.html',
  styleUrl: './obseques.component.css'
})
export class ObsequesComponent implements OnInit {
  obsequesForm: FormGroup;
  private subscriptions = new Subscription();

  constructor(private fb: FormBuilder) {
    this.obsequesForm = this.fb.group({
      preneur: this.fb.group({
        genre: ['Madame'],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        adresse: [''],
        codePostal: [''],
        email: ['', [Validators.required, Validators.email]],
        dateNaissance: ['', Validators.required]
      }),
      nombreAssures: [1],
      preneurEstAssure: [false],
      assures: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.updateAssuresArray(1);
    this.handleFormChanges();
  }

  get assures(): FormArray {
    return this.obsequesForm.get('assures') as FormArray;
  }

  createAssureGroup(): FormGroup {
    return this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      capital: [5000, [Validators.required, Validators.max(15000)]]
    });
  }

  updateAssuresArray(count: number): void {
    while (this.assures.length !== count) {
      if (this.assures.length < count) {
        this.assures.push(this.createAssureGroup());
      } else {
        this.assures.removeAt(this.assures.length - 1);
      }
    }
    this.updatePreneurSiAssure();
  }

  handleFormChanges(): void {
    this.subscriptions.add(
      this.obsequesForm.get('nombreAssures')?.valueChanges.subscribe(val => {
        this.updateAssuresArray(val);
      })
    );

    this.subscriptions.add(
      this.obsequesForm.get('preneurEstAssure')?.valueChanges.subscribe(() => {
        this.updatePreneurSiAssure();
      })
    );
  }

  updatePreneurSiAssure(): void {
    const preneurEstAssure = this.obsequesForm.get('preneurEstAssure')?.value;
    const preneur = this.obsequesForm.get('preneur')?.value;
    if (preneurEstAssure && this.assures.length > 0) {
      this.assures.at(0).patchValue({
        nom: preneur.nom,
        prenom: preneur.prenom,
        dateNaissance: preneur.dateNaissance
      });
    }
  }

  onSubmit(): void {
    if (this.obsequesForm.valid) {
      console.log(this.obsequesForm.value);
      // Logique de soumission du formulaire
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}