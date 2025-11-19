import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appPhoneNumberFormat]',
  standalone: true,
})
export class PhoneNumberFormatDirective {

  constructor(private ngControl: NgControl) { }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    const formattedValue = this.formatPhoneNumber(value);
    // On s'assure que le contrôle existe avant de mettre à jour sa valeur.
    if (this.ngControl.control) {
      this.ngControl.control.setValue(formattedValue, { emitEvent: false });
    }
  }

  private formatPhoneNumber(value: string): string {
    if (!value) {
      return '';
    }

    // Supprime tous les caractères qui ne sont pas des chiffres
    const digits = value.replace(/\D/g, '');

    // Limite à 10 chiffres pour un numéro mobile, 9 pour un fixe.
    const isMobile = digits.startsWith('04');
    const maxLength = isMobile ? 10 : 9;
    const truncatedDigits = digits.substring(0, maxLength);

    const parts = [];
    if (isMobile) {
      // Format mobile: 04XX XX XX XX
      if (truncatedDigits.length > 0) parts.push(truncatedDigits.substring(0, 4));
      if (truncatedDigits.length > 4) parts.push(truncatedDigits.substring(4, 6));
      if (truncatedDigits.length > 6) parts.push(truncatedDigits.substring(6, 8));
      if (truncatedDigits.length > 8) parts.push(truncatedDigits.substring(8, 10));
    } else {
      // Format fixe: 0X XXX XX XX
      if (truncatedDigits.length > 0) parts.push(truncatedDigits.substring(0, 2));
      if (truncatedDigits.length > 2) parts.push(truncatedDigits.substring(2, 5));
      if (truncatedDigits.length > 5) parts.push(truncatedDigits.substring(5, 7));
      if (truncatedDigits.length > 7) parts.push(truncatedDigits.substring(7, 9));
    }

    return parts.join(' ');
  }
}