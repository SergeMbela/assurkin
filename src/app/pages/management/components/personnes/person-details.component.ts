import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Personne as Person} from '../../../../models/personne.model'; // Mettez le bon chemin

@Component({
  selector: 'app-person-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './person-details.component.html',
  styleUrl: './person-details.component.css' // Vous pouvez créer ce fichier si nécessaire, ou le laisser vide
})
export class PersonDetailsComponent implements OnInit {
  @Input() title!: string;
  @Input() person: Person | null = null;
  @Input() getMaritalStatusLabel!: (statusId: number) => string; // Fonction passée en input

  constructor() {}

  ngOnInit(): void {
    // Des validations simples pour s'assurer que les inputs sont fournis
    if (!this.person) console.warn('PersonDetailsComponent: [person] input is missing.');
    if (!this.title) console.warn('PersonDetailsComponent: [title] input is missing.');
    if (!this.getMaritalStatusLabel) console.warn('PersonDetailsComponent: [getMaritalStatusLabel] input is missing.');
  }
}