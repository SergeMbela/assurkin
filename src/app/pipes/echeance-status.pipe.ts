import { Pipe, PipeTransform, inject } from '@angular/core';
import { EcheanceStatusService } from '../services/echeance-status.service';

@Pipe({
  name: 'echeanceStatus',
  standalone: true
})
export class EcheanceStatusPipe implements PipeTransform {
  private statusService = inject(EcheanceStatusService);

  transform(statusId: number | undefined | null): string {
    if (statusId === undefined || statusId === null) {
      return 'Indéfini';
    }
    return this.statusService.getStatusLabel(statusId);
  }

}
