import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AutoManagementService, AutoRequest } from './auto-management.service';

@Component({
  selector: 'app-auto-management',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auto-management.component.html',
})
export class AutoManagementComponent implements OnInit {
  allRequests: AutoRequest[] = [];
  paginatedRequests: AutoRequest[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  constructor(
    private router: Router,
    private autoManagementService: AutoManagementService
  ) {}

  ngOnInit(): void {
    this.autoManagementService.getAutoRequests().subscribe(requests => {
      this.allRequests = requests;
      this.totalPages = Math.ceil(this.allRequests.length / this.itemsPerPage);
      this.setPage(1);
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRequests = this.allRequests.slice(startIndex, endIndex);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  viewDetails(id: number): void {
    // Navigation vers le détail de la demande auto.
    this.router.navigate(['/assurance_auto', id]);
  }
}