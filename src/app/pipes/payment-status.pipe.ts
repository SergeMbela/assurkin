import { Pipe, PipeTransform } from '@angular/core';
import { PaymentStatus } from '../services/payment.service';

@Pipe({
  name: 'paymentStatus',
  standalone: true
})
export class PaymentStatusPipe implements PipeTransform {

  private statusMap: Record<PaymentStatus, string> = {
    pending: 'En attente',
    paid: 'Payé',
    failed: 'Échoué',
    cancelled: 'Annulé',
    overdue: 'En retard'
  };

  transform(value: PaymentStatus | undefined | null): string {
    if (!value) return '';
    return this.statusMap[value] || value;
  }

}