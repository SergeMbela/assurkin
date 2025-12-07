import { Directive, HostListener, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatBelgianPhoneNumber } from '../directives/phone-number.utils'; // Import de la fonction utilitaire

@Directive({
  selector: '[appPhoneNumberMask]',
  standalone: true
})
export class PhoneNumberMaskDirective {
  constructor(private el: ElementRef, private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const initialValue = input.value;

    // Formater la valeur en utilisant la fonction utilitaire
    const formattedValue = formatBelgianPhoneNumber(initialValue);

    // Mettre à jour la valeur de l'input et du FormControl si elle a changé
    // Cela évite les boucles infinies ou les sauts de curseur inutiles
    if (input.value !== formattedValue) {
      input.value = formattedValue;
      // Mettre à jour le FormControl sans déclencher un nouvel événement 'input'
      this.ngControl.control?.setValue(formattedValue, { emitEvent: false });
    }
  }

  @HostListener('blur')
  onBlur(): void {
    const input = this.el.nativeElement as HTMLInputElement;
    const formattedValue = formatBelgianPhoneNumber(input.value);

    // Si la valeur formatée est juste "+32" ou vide, effacer le champ
    // Cela gère les cas où l'utilisateur commence à taper mais n'entre pas de numéro complet
    if (formattedValue === '+32' || formattedValue === '') {
      input.value = '';
      this.ngControl.control?.setValue('', { emitEvent: false });
    } else {
      input.value = formattedValue;
      this.ngControl.control?.setValue(formattedValue, { emitEvent: false });
    }
  }
}