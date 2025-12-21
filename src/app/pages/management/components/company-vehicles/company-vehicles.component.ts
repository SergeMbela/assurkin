import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompanyService, CompanyVehicle, CompanyDriver } from '../../../../services/company.service';

@Component({
  selector: 'app-company-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-vehicles.component.html',
  styleUrls: []
})
export class CompanyVehiclesComponent implements OnInit {
  @Input() companyId: string | null = null;
  vehicles: CompanyVehicle[] = [];
  drivers: CompanyDriver[] = [];
  isLoading = false;
  error: string | null = null;
  showForm = false;
  isEditing = false;
  currentVehicle: Partial<CompanyVehicle> = {};
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
  Math = Math;
  
  showDeleteModal = false;
  vehicleToDeleteId: string | null = null;

  constructor(
    private companyService: CompanyService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.companyId) {
      this.companyId = this.route.snapshot.paramMap.get('id');
    }

    if (this.companyId) {
      this.loadData();
    }
  }

  get filteredVehicles(): CompanyVehicle[] {
    if (!this.searchTerm) {
      return this.vehicles;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.vehicles.filter(vehicle => 
      vehicle.make.toLowerCase().includes(lowerTerm) || 
      vehicle.model.toLowerCase().includes(lowerTerm) || 
      (vehicle.license_plate && vehicle.license_plate.toLowerCase().includes(lowerTerm))
    );
  }

  get paginatedVehicles(): CompanyVehicle[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVehicles.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredVehicles.length / this.itemsPerPage);
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

  loadData(): void {
    this.isLoading = true;
    // Load drivers first to populate the dropdown and names
    this.companyService.getCompanyDrivers(this.companyId!).subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.loadVehicles();
      },
      error: (err) => {
        console.error('Error loading drivers', err);
        this.error = 'Erreur lors du chargement des données.';
        this.isLoading = false;
      }
    });
  }

  loadVehicles(): void {
    this.companyService.getCompanyVehicles(this.companyId!).subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading vehicles', err);
        this.error = 'Erreur lors du chargement des véhicules.';
        this.isLoading = false;
      }
    });
  }

  getDriverName(driverId: string | null | undefined): string {
    if (!driverId) return 'Non assigné';
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Inconnu';
  }

  initAdd(): void {
    this.showForm = true;
    this.isEditing = false;
    this.currentVehicle = { company_id: this.companyId! };
    this.error = null;
  }

  initEdit(vehicle: CompanyVehicle): void {
    this.showForm = true;
    this.isEditing = true;
    this.currentVehicle = { ...vehicle };
    this.error = null;
  }

  cancelForm(): void {
    this.showForm = false;
    this.currentVehicle = {};
    this.error = null;
  }

  saveVehicle(): void {
    if (!this.companyId) return;

    if (!this.currentVehicle.make || !this.currentVehicle.model) {
      this.error = 'Marque et Modèle sont obligatoires.';
      return;
    }

    this.isLoading = true;
    this.error = null;

    if (this.isEditing && this.currentVehicle.id) {
      this.companyService.updateCompanyVehicle(this.currentVehicle as CompanyVehicle & { id: string }).subscribe({
        next: (updated) => {
          const index = this.vehicles.findIndex(v => v.id === updated.id);
          if (index !== -1) {
            this.vehicles[index] = updated;
          }
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.error = 'Erreur lors de la mise à jour du véhicule.';
          this.isLoading = false;
          console.error(err);
        }
      });
    } else {
      this.companyService.addCompanyVehicle(this.currentVehicle).subscribe({
        next: (newVehicle) => {
          this.vehicles.unshift(newVehicle);
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.error = 'Erreur lors de l\'ajout du véhicule.';
          this.isLoading = false;
          console.error(err);
        }
      });
    }
  }

  deleteVehicle(id: string): void {
    this.vehicleToDeleteId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.vehicleToDeleteId) return;
    
    this.isLoading = true;
    this.companyService.deleteCompanyVehicle(this.vehicleToDeleteId).subscribe({
      next: () => {
        this.vehicles = this.vehicles.filter(v => v.id !== this.vehicleToDeleteId);
        this.isLoading = false;
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error = 'Erreur lors de la suppression du véhicule.';
        this.isLoading = false;
        this.closeDeleteModal();
        console.error(err);
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.vehicleToDeleteId = null;
  }

  exportToCsv(): void {
    const data = this.filteredVehicles;
    if (data.length === 0) return;

    const headers = ['Marque', 'Modèle', 'Plaque', 'VIN', 'Date immatriculation', 'Carburant', 'Chauffeur'];
    const csvContent = [
      headers.join(','),
      ...data.map(v => [
        v.make,
        v.model,
        v.license_plate,
        v.vin,
        v.first_registration_date,
        v.fuel_type,
        this.getDriverName(v.driver_id)
      ].map(f => `"${(f || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'vehicules.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  importFromCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.processCsvData(text);
      input.value = '';
    };

    reader.readAsText(file);
  }

  processCsvData(csvText: string): void {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      this.error = "Le fichier CSV semble vide ou ne contient pas d'en-tête.";
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const vehiclesToImport: Partial<CompanyVehicle>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      if (values.length < 2) continue;

      const getVal = (headerName: string) => {
        const index = headers.indexOf(headerName);
        return index > -1 ? values[index] : undefined;
      };

      const vehicle: Partial<CompanyVehicle> = {
        company_id: this.companyId!,
        make: getVal('Marque'),
        model: getVal('Modèle'),
        license_plate: getVal('Plaque'),
        vin: getVal('VIN'),
        first_registration_date: getVal('Date immatriculation'),
        fuel_type: getVal('Carburant')
      };

      const driverName = getVal('Chauffeur');
      if (driverName) {
        const driver = this.drivers.find(d => `${d.first_name} ${d.last_name}` === driverName);
        if (driver) vehicle.driver_id = driver.id;
      }

      if (vehicle.make && vehicle.model) {
        vehiclesToImport.push(vehicle);
      }
    }

    if (vehiclesToImport.length === 0) {
      this.error = "Aucun véhicule valide trouvé à importer.";
      return;
    }

    this.isLoading = true;
    forkJoin(vehiclesToImport.map(v => this.companyService.addCompanyVehicle(v))).subscribe({
      next: (newVehicles) => {
        this.vehicles = [...newVehicles.reverse(), ...this.vehicles];
        this.isLoading = false;
        this.error = null;
      },
      error: (err) => {
        console.error('Error importing vehicles', err);
        this.error = "Erreur lors de l'importation des véhicules.";
        this.isLoading = false;
      }
    });
  }
}