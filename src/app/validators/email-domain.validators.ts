import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function emailDomainValidator(requiredDomain: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = control.value;
    if (!email) {
      return null;
    }

    const escapedDomain = requiredDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`@${escapedDomain}$`, 'i');
    const valid = pattern.test(email);

    return valid ? null : { emailDomain: { requiredDomain } };
  };
}
