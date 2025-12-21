import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompanyService, CompanyDriver } from '../../../../services/company.service';

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
  isEditing = false;
  currentDriver: Partial<CompanyDriver> = {};
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
  Math = Math;
  showDeleteModal = false;
  driverToDeleteId: string | null = null;

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

  get filteredDrivers(): CompanyDriver[] {
    if (!this.searchTerm) {
      return this.drivers;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.drivers.filter(driver => 
      driver.last_name.toLowerCase().includes(lowerTerm) || 
      driver.first_name.toLowerCase().includes(lowerTerm)
    );
  }

  get paginatedDrivers(): CompanyDriver[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDrivers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDrivers.length / this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
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
    this.isEditing = false;
    this.currentDriver = { company_id: this.companyId! };
    this.error = null;
  }

  initEdit(driver: CompanyDriver): void {
    this.showForm = true;
    this.isEditing = true;
    this.currentDriver = { ...driver };
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

    if (this.isEditing && this.currentDriver.id) {
      this.companyService.updateCompanyDriver(this.currentDriver as CompanyDriver & { id: string }).subscribe({
        next: (updated) => {
          const index = this.drivers.findIndex(d => d.id === updated.id);
          if (index !== -1) {
            this.drivers[index] = updated;
          }
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.error = 'Erreur lors de la mise à jour du chauffeur';
          this.isLoading = false;
          console.error(err);
        }
      });
    } else {
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

  deleteDriver(id: string): void {
    this.driverToDeleteId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.driverToDeleteId) return;
    
    this.isLoading = true;
    this.companyService.deleteCompanyDriver(this.driverToDeleteId).subscribe({
      next: () => {
        this.drivers = this.drivers.filter(d => d.id !== this.driverToDeleteId);
        this.isLoading = false;
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error = 'Erreur lors de la suppression du chauffeur';
        this.isLoading = false;
        this.closeDeleteModal();
        console.error(err);
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.driverToDeleteId = null;
  }

  exportToCsv(): void {
    const data = this.filteredDrivers;
    if (data.length === 0) return;

    const headers = ['Nom', 'Prénom', 'Date de naissance', 'Numéro de permis', 'Date du permis'];
    const csvContent = [
      headers.join(','),
      ...data.map(d => [
        d.last_name,
        d.first_name,
        d.birth_date,
        d.license_number,
        d.license_date
      ].map(f => `"${(f || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'chauffeurs.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}