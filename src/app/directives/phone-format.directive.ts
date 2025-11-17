import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appPhoneFormat]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: PhoneFormatDirective,
      multi: true,
    },
  ],
})
export class PhoneFormatDirective implements ControlValueAccessor {
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  writeValue(value: any): void {
    const formattedValue = this.formatPhoneNumber(value || '');
    this.renderer.setProperty(this.el.nativeElement, 'value', formattedValue);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (!inputElement) {
      return;
    }

    // Garde seulement les chiffres
    const cleanedValue = inputElement.value.replace(/\D/g, '');
    const formattedValue = this.formatPhoneNumber(cleanedValue);

    this.renderer.setProperty(inputElement, 'value', formattedValue);
    this.onChange(cleanedValue); // Envoie la valeur brute (chiffres) au modèle
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  private formatPhoneNumber(value: string): string {
    if (!value) {
      return '';
    }

    // S'assure que le numéro commence par '32'
    let number = value.startsWith('32') ? value.substring(2) : value;

    // Format pour les numéros mobiles (commençant par 4)
    if (number.startsWith('4')) {
      const part1 = number.slice(0, 3);
      const part2 = number.slice(3, 5);
      const part3 = number.slice(5, 7);
      const part4 = number.slice(7, 9);
      return `+32 ${part1} ${part2} ${part3} ${part4}`.trim();
    }

    // Format pour les numéros fixes
    const part1 = number.slice(0, 1); // ex: 2 pour Bruxelles
    const part2 = number.slice(1, 4);
    const part3 = number.slice(4, 6);
    const part4 = number.slice(6, 8);
    return `+32 ${part1} ${part2} ${part3} ${part4}`.trim();
  }
}