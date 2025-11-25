import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AutoManagementService, AutoRequest } from './auto-management.service';

@Component({
  selector: 'app-auto-management',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './auto-management.component.html',
})
export class AutoManagementComponent implements OnInit {
  paginatedRequests: AutoRequest[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';

  constructor(
    private router: Router,
    private autoManagementService: AutoManagementService
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.autoManagementService.getAutoRequests(this.searchTerm, this.currentPage, this.itemsPerPage).subscribe(response => {
      this.paginatedRequests = response.data;
      this.totalItems = response.count || 0;
      if (response.count) {
        this.totalPages = Math.ceil(response.count / this.itemsPerPage);
      } else {
        this.totalPages = 1;
      }
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadRequests();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  viewDetails(id: number): void {
    // Navigation vers le détail de la demande auto.
    this.router.navigate(['/assurance_auto', id]);
  }
}