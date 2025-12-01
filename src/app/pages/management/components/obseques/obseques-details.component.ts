import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assureur } from '../../../../services/db-connect.service';
import { getCompanyName as getCompanyNameHelper, getStatutClass as getStatutClassHelper } from '../../display-helpers';

@Component({
  selector: 'app-obseques-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obseques-details.component.html',
})
export class ObsequesDetailsComponent {
  @Input() formValue: any;
  @Input() insuranceCompanies: Assureur[] = [];

  getCompanyName(companyId: number | null | undefined): string {
    return getCompanyNameHelper(companyId, this.insuranceCompanies);
  }

  public getStatutClass(statut: string | null | undefined): { [key: string]: boolean } {
    return getStatutClassHelper(statut);
  }
}