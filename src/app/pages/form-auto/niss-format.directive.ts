import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appNissFormat]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: NissFormatDirective,
      multi: true,
    },
  ],
})
export class NissFormatDirective implements ControlValueAccessor {
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  writeValue(value: any): void {
    const formattedValue = this.formatNiss(value || '');
    this.renderer.setProperty(this.el.nativeElement, 'value', formattedValue);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    const cleanedValue = value.replace(/\D/g, '');
    const formattedValue = this.formatNiss(cleanedValue);
    this.renderer.setProperty(this.el.nativeElement, 'value', formattedValue);
    this.onChange(cleanedValue); // Send the raw digits to the form model
  }

  private formatNiss(value: string): string {
    if (!value) return '';

    const year = value.slice(0, 2);
    const month = value.slice(2, 4);
    const day = value.slice(4, 6);
    const serial = value.slice(6, 9);
    const checksum = value.slice(9, 11);

    let formatted = year;
    if (value.length > 2) formatted += '.' + month;
    if (value.length > 4) formatted += '.' + day;
    if (value.length > 6) formatted += '-' + serial;
    if (value.length > 9) formatted += '.' + checksum;

    return formatted;
  }
}