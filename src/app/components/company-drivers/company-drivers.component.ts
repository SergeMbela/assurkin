import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompanyService, CompanyDriver } from '../../services/company.service';

@Component({
  selector: 'app-company-drivers',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './company-drivers.component.html',
  styleUrls: ['./company-drivers.component.css']
})
export class CompanyDriversComponent implements OnInit {
  @Input() companyId: string | null = null;
  drivers: CompanyDriver[] = [];
  isLoading = false;
  error: string | null = null;
  showForm = false;
  currentDriver: Partial<CompanyDriver> = {};

  constructor(
    private companyService: CompanyService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // If companyId is not passed as Input, try to get it from the route
    if (!this.companyId) {
      this.companyId = this.route.snapshot.paramMap.get('id');
    }

    if (this.companyId) {
      this.loadDrivers();
    }
  }

  loadDrivers(): void {
    if (!this.companyId) return;
    this.isLoading = true;
    this.companyService.getCompanyDrivers(this.companyId).subscribe({
      next: (data) => {
        this.drivers = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des chauffeurs';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  initAdd(): void {
    this.showForm = true;
    this.currentDriver = { company_id: this.companyId! };
    this.error = null;
  }

  cancelForm(): void {
    this.showForm = false;
    this.currentDriver = {};
    this.error = null;
  }

  saveDriver(): void {
    if (!this.companyId) return;

    if (!this.currentDriver.first_name || !this.currentDriver.last_name || !this.currentDriver.license_number) {
      this.error = 'Veuillez remplir les champs obligatoires (Nom, Prénom, Numéro de permis)';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.companyService.addCompanyDriver(this.currentDriver as any).subscribe({
      next: (response) => {
        // RPC returns an array of inserted rows
        const newDriver = Array.isArray(response) ? response[0] : response;
        this.drivers.unshift(newDriver);
        this.isLoading = false;
        this.cancelForm();
      },
      error: (err) => {
        this.error = 'Erreur lors de l\'ajout du chauffeur';
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}