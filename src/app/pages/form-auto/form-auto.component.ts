import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BELGIAN_POST_CODES, PostalCodeCity } from '../form-auto/belgian-post-codes';

@Component({
  selector: 'app-form-auto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-auto.component.html',
})
export class FormAutoComponent implements OnInit {

  // --- Preneur d'assurance ---
  preneurPostalCode = '';
  preneurCity = '';
  preneurCities: string[] = [];
  filteredPreneurPostalCodes: PostalCodeCity[] = [];

  // --- Conducteur principal ---
  conducteurPostalCode = '';
  conducteurCity = '';
  conducteurCities: string[] = [];
  filteredConducteurPostalCodes: PostalCodeCity[] = [];

  // --- Logique de visibilité ---
  isConducteurDifferent = false;

  // --- Date minimum ---
  minDate: string;

  constructor() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];
  }
  ngOnInit(): void {}

  /**
   * Gère la recherche et le filtrage des codes postaux lors de la saisie.
   * @param event L'événement d'input.
   * @param type 'preneur' ou 'conducteur'.
   */
  onPostalCodeInput(event: Event, type: 'preneur' | 'conducteur'): void {
    const input = (event.target as HTMLInputElement).value;
    const postalCodes = input ? BELGIAN_POST_CODES.filter(pc => pc.postalCode.startsWith(input)) : [];

    // Pour éviter les doublons dans la liste d'autocomplétion
    const uniquePostalCodes = Array.from(new Map(postalCodes.map(item => [item['postalCode'], item])).values());

    if (type === 'preneur') {
      this.preneurPostalCode = input;
      this.filteredPreneurPostalCodes = uniquePostalCodes.slice(0, 5); // Limite à 5 suggestions
      if (uniquePostalCodes.length !== 1 || uniquePostalCodes[0].postalCode !== input) {
        this.preneurCities = [];
        this.preneurCity = '';
      }
    } else {
      this.conducteurPostalCode = input;
      this.filteredConducteurPostalCodes = uniquePostalCodes.slice(0, 5);
      if (uniquePostalCodes.length !== 1 || uniquePostalCodes[0].postalCode !== input) {
        this.conducteurCities = [];
        this.conducteurCity = '';
      }
    }
  }

  /**
   * Gère la sélection d'un code postal dans la liste d'autocomplétion.
   * @param postalCode Le code postal sélectionné.
   * @param type 'preneur' ou 'conducteur'.
   */
  selectPostalCode(postalCode: string, type: 'preneur' | 'conducteur'): void {
    const cities = BELGIAN_POST_CODES
      .filter(pc => pc.postalCode === postalCode)
      .map(pc => pc.city);

    if (type === 'preneur') {
      this.preneurPostalCode = postalCode;
      this.preneurCities = cities;
      this.preneurCity = cities.length > 0 ? cities[0] : '';
      this.filteredPreneurPostalCodes = [];
    } else {
      this.conducteurPostalCode = postalCode;
      this.conducteurCities = cities;
      this.conducteurCity = cities.length > 0 ? cities[0] : '';
      this.filteredConducteurPostalCodes = [];
    }
  }
}