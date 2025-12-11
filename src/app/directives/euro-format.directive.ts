import { Directive, ElementRef, HostListener, OnInit, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appEuroFormat]',
  standalone: true,
})
export class EuroFormatDirective implements OnInit {

  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() private ngControl: NgControl
  ) {}

  ngOnInit() {
    const initialValue = this.ngControl?.control?.value;
    this.formatValue(initialValue);
  }

  @HostListener('focus')
  onFocus() {
    const value = this.el.nativeElement.value;

    // Affiche la valeur brute (numérique) pour édition
    const rawValue = this.parse(value);
    this.el.nativeElement.value = rawValue;
  }

  @HostListener('blur')
  onBlur() {
    const value = this.el.nativeElement.value;
    this.formatValue(value);
  }

  private formatValue(value: string | number | null | undefined) {
    if (value == null) {
      this.resetField();
      return;
    }

    const raw = this.parse(String(value));

    if (raw === '' || isNaN(Number(raw))) {
      this.resetField();
      return;
    }

    const numericValue = Number(raw);

    const formatted = new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);

    this.el.nativeElement.value = formatted;

    // Mise à jour silencieuse du modèle
    this.ngControl?.control?.setValue(numericValue, { emitEvent: false });
  }

  private resetField() {
    this.el.nativeElement.value = '';
    this.ngControl?.control?.setValue(null, { emitEvent: false });
  }

  private parse(value: string): string {
    // Supprime tout sauf les chiffres
    return value.replace(/\D/g, '');
  }
}
