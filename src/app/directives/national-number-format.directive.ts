import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appNationalNumberFormat]',
  standalone: true
})
export class NationalNumberFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Supprime tous les caractères non numériques

    if (value.length > 11) {
      value = value.substring(0, 11); // Limite à 11 chiffres
    }

    let formattedValue = '';
    if (value.length > 0) formattedValue += value.substring(0, 2);
    if (value.length > 2) formattedValue += '.' + value.substring(2, 4);
    if (value.length > 4) formattedValue += '.' + value.substring(4, 6);
    if (value.length > 6) formattedValue += '-' + value.substring(6, 9);
    if (value.length > 9) formattedValue += '.' + value.substring(9, 11);

    input.value = formattedValue;
  }
}