import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CompanyService, CompanyBuilding } from '../../services/company.service';

@Component({
  selector: 'app-company-buildings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-buildings.component.html',
  styleUrls: ['./company-buildings.component.css']
})
export class CompanyBuildingsComponent implements OnInit {
  @Input() companyId: string | null = null;
  buildings: CompanyBuilding[] = [];
  isLoading = false;
  error: string | null = null;

  // Form state
  showForm = false;
  isEditing = false;
  currentBuilding: Partial<CompanyBuilding> = {};

  // Search & Pagination
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 5;
  showDeleteModal = false;
  buildingToDeleteId: string | null = null;

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
      this.loadBuildings();
    }
  }

  get filteredBuildings(): CompanyBuilding[] {
    if (!this.searchTerm) {
      return this.buildings;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.buildings.filter(b => 
      b.address.toLowerCase().includes(lowerTerm) || 
      (b.city && b.city.toLowerCase().includes(lowerTerm)) ||
      (b.building_type && b.building_type.toLowerCase().includes(lowerTerm))
    );
  }

  get paginatedBuildings(): CompanyBuilding[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredBuildings.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredBuildings.length / this.itemsPerPage);
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

  loadBuildings(): void {
    if (!this.companyId) return;
    this.isLoading = true;
    this.companyService.getCompanyBuildings(this.companyId).subscribe({
      next: (data) => {
        this.buildings = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des bâtiments.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  initAdd(): void {
    this.currentBuilding = { company_id: this.companyId! };
    this.isEditing = false;
    this.showForm = true;
    this.error = null;
  }

  initEdit(building: CompanyBuilding): void {
    this.currentBuilding = { ...building };
    this.isEditing = true;
    this.showForm = true;
    this.error = null;
  }

  cancelForm(): void {
    this.showForm = false;
    this.currentBuilding = {};
    this.error = null;
  }

  saveBuilding(): void {
    if (!this.companyId) return;

    // Basic validation
    if (!this.currentBuilding.address) {
      this.error = 'L\'adresse est obligatoire.';
      return;
    }

    this.isLoading = true;
    this.error = null;

    if (this.isEditing && this.currentBuilding.id) {
      this.companyService.updateCompanyBuilding(this.currentBuilding as CompanyBuilding & { id: string }).subscribe({
        next: (updated) => {
          const index = this.buildings.findIndex(b => b.id === updated.id);
          if (index !== -1) {
            this.buildings[index] = updated;
          }
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.error = 'Erreur lors de la mise à jour du bâtiment.';
          this.isLoading = false;
          console.error(err);
        }
      });
    } else {
      // Cast to any to satisfy the Omit type for the service method, assuming required fields are present
      this.companyService.addCompanyBuilding(this.currentBuilding as any).subscribe({
        next: (newBuilding) => {
          this.buildings.unshift(newBuilding);
          this.isLoading = false;
          this.cancelForm();
        },
        error: (err) => {
          this.error = 'Erreur lors de l\'ajout du bâtiment.';
          this.isLoading = false;
          console.error(err);
        }
      });
    }
  }

  deleteBuilding(id: string): void {
    this.buildingToDeleteId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.buildingToDeleteId) return;
    
    this.isLoading = true;
    this.companyService.deleteCompanyBuilding(this.buildingToDeleteId).subscribe({
      next: () => {
        this.buildings = this.buildings.filter(b => b.id !== this.buildingToDeleteId);
        this.isLoading = false;
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error = 'Erreur lors de la suppression du bâtiment.';
        this.isLoading = false;
        this.closeDeleteModal();
        console.error(err);
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.buildingToDeleteId = null;
  }
}
