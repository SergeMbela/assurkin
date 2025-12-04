import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbConnectService } from '../../services/db-connect.service';

@Component({
  selector: 'app-update-userdata',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-userdata.component.html',
  styleUrl: './update-userdata.component.css'
})
export class UpdateUserdataComponent implements OnInit {
  @Input() id!: number;
  @Output() closeModal = new EventEmitter<boolean>();

  updateForm!: FormGroup;
  isLoading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dbConnectService: DbConnectService
  ) {}

  ngOnInit(): void {
    this.updateForm = this.fb.group({
      genre: [''],
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      date_naissance: [''],
      numero_national: [''],
      nationality: [''],
      marital_status: [''],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      adresse: [''],
      code_postal: [''],
      ville: [''],
      permis_numero: [''],
      permis_date: ['']
    });

    this.loadPreneurData();
  }

  async loadPreneurData(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const { data, error } = await this.dbConnectService.getPersonneById(this.id);
      if (error) throw error;
      if (data) {
        this.updateForm.patchValue(data);
      }
    } catch (err: any) {
      this.error = `Erreur lors du chargement des données : ${err.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.updateForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const { error } = await this.dbConnectService.updatePersonne(this.id, this.updateForm.value);
      if (error) throw error;

      // Succès : on émet l'événement pour fermer la modale et rafraîchir la liste
      this.closeModal.emit(true);

    } catch (err: any) {
      this.error = `Erreur lors de la mise à jour : ${err.message}`;
    } finally {
      this.isLoading = false;
    }
  }
}
