import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appEuroFormat]',
  standalone: true,
})
export class EuroFormatDirective implements OnInit {

  constructor(private el: ElementRef, private ngControl: NgControl) {}

  ngOnInit() {
    // Formate la valeur initiale au chargement du composant
    const value = this.ngControl.control?.value;
    this.formatValue(value);
  }

  @HostListener('focus', ['$event.target.value'])
  onFocus(value: string) {
    // Au focus, on affiche la valeur numérique brute pour faciliter l'édition
    const rawValue = this.parse(value);
    this.el.nativeElement.value = rawValue;
  }

  @HostListener('blur', ['$event.target.value'])
  onBlur(value: string) {
    // Au "blur" (quand on quitte le champ), on formate la valeur
    this.formatValue(value);
  }

  private formatValue(value: string | number | null) {
    if (value === null || value === '' || isNaN(Number(this.parse(String(value))))) {
      this.el.nativeElement.value = '';
      this.ngControl.control?.setValue(null, { emitEvent: false });
      return;
    }

    const numericValue = Number(this.parse(String(value)));

    const formattedValue = new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);

    this.el.nativeElement.value = formattedValue;
    // On stocke la valeur numérique brute dans le FormControl
    this.ngControl.control?.setValue(numericValue, { emitEvent: false });
  }

  private parse(value: string): string {
    // Ne garde que les chiffres de la chaîne de caractères
    return String(value).replace(/\D/g, '');
  }
}