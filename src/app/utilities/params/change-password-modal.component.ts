import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const passwordConfirm = control.get('passwordConfirm');

  if (password && passwordConfirm && password.value !== passwordConfirm.value) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password-modal.component.html',
  styleUrl: './change-password-modal.component.css'
})
export class ChangePasswordModalComponent {
  @Input() userId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{userId: string, password: string}>();

  passwordForm: FormGroup;
  private fb = inject(FormBuilder);

  constructor() {
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', [Validators.required]]
    }, { validators: passwordsMatchValidator });
  }

  onCancel() {
    this.close.emit();
  }

  onSubmit() {
    if (this.passwordForm.valid && this.userId) {
      this.save.emit({
        userId: this.userId,
        password: this.passwordForm.value.password
      });
    } else {
      this.passwordForm.markAllAsTouched();
    }
  }
}
