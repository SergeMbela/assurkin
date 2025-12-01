import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Assureur, DbConnectService } from '../../services/db-connect.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-auto-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auto-details.component.html',
})
export class AutoDetailsComponent implements OnInit, OnDestroy {
  @Input() formValue: any;

  private destroy$ = new Subject<void>();
  private insuranceCompanies: Assureur[] = [];

  constructor(private dbService: DbConnectService) {}

  ngOnInit(): void {
    this.dbService.getAllAssureurs().pipe(
      takeUntil(this.destroy$)
    ).subscribe(companies => {
      this.insuranceCompanies = companies || [];
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCompanyName(companyId: number): string {
    if (!companyId || !this.insuranceCompanies || this.insuranceCompanies.length === 0) {
      return 'N/A';
    }
    const company = this.insuranceCompanies.find(c => c.id === companyId);
    return company ? company.nom : `Inconnue (ID: ${companyId})`;
  }

  public getStatutClass(statut: string | null | undefined): { [key: string]: boolean } {
    if (!statut) return { 'bg-gray-100': true, 'text-gray-800': true };
    const classMap: { [key: string]: { [key: string]: boolean } } = {
      'Nouveau': { 'bg-blue-100': true, 'text-blue-800': true },
      'En cours': { 'bg-yellow-100': true, 'text-yellow-800': true },
      'Terminé': { 'bg-green-100': true, 'text-green-800': true },
    };
    return classMap[statut] || { 'bg-gray-100': true, 'text-gray-800': true };
  }
}