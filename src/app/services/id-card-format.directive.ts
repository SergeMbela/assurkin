import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appIdCardFormat]',
  standalone: true
})
export class IdCardFormatDirective {

  constructor(private el: ElementRef<HTMLInputElement>) { }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      const formattedValue = this.formatIdCard(input.value);
      input.value = formattedValue;
    }
  }

  private formatIdCard(value: string): string {
    if (!value) {
      return '';
    }

    // 1. Keep only digits
    const digitsOnly = value.replace(/\D/g, '');

    // 2. Apply the XXX-XXXXXXX-XX format
    return [
      digitsOnly.slice(0, 3),
      digitsOnly.slice(3, 10),
      digitsOnly.slice(10, 12)
    ]
    .filter(part => part) // Remove empty parts
    .join('-');
  }
}