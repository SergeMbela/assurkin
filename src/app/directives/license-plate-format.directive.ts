import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appLicensePlateFormat]',
  standalone: true,
})
export class LicensePlateFormatDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    if (inputElement) {
      const formattedValue = this.formatLicensePlate(inputElement.value);
      this.el.nativeElement.value = formattedValue;
    }
  }

  private formatLicensePlate(value: string): string {
    if (!value) {
      return '';
    }

    // 1. Nettoyer et mettre en majuscules
    const cleanedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 2. Appliquer le format "X XXX XXX"
    let formatted = cleanedValue.substring(0, 1);
    if (cleanedValue.length > 1) {
      formatted += ' ' + cleanedValue.substring(1, 4);
    }
    if (cleanedValue.length > 4) {
      formatted += ' ' + cleanedValue.substring(4, 7);
    }

    return formatted;
  }
}