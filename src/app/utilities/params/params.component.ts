import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DbConnectService, Person } from '../../services/db-connect.service';
import { ChangePasswordModalComponent } from '../../utilities/params/change-password-modal.component';
import { ConfirmationModalComponent } from '../../utilities/params/confirmation-modal.component';

@Component({
  selector: 'app-params',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChangePasswordModalComponent, ConfirmationModalComponent],
  templateUrl: './params.component.html',
  styleUrl: './params.component.css'
})
export class ParamsComponent implements OnInit {
  private dbService = inject(DbConnectService);
  
  tabs = ['clients', 'corporate', 'autres'];
  tabLabels: { [key: string]: string } = {
    clients: 'Clients',
    corporate: 'Corporate',
    autres: 'Autres'
  };
  activeTab: string = 'clients';

  peopleWithAccounts: Person[] = [];
  filteredPeople: Person[] = [];
  authUsers: any[] = [];
  filteredAuthUsers: any[] = [];
  searchAuthTerm: string = '';
  searchTerm: string = '';
  loading = true;
  error: string | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // État de la modale
  showPasswordModal = false;
  selectedUserId: string | null = null;
  
  // État de la modale de suppression
  showDeleteModal = false;
  userToDeleteId: string | null = null;

  ngOnInit() {
    this.loadPeople();
    this.loadAuthUsers();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  loadPeople() {
    this.loading = true;
    this.dbService.getPeopleWithAccounts().subscribe({
      next: (data) => {
        this.peopleWithAccounts = data;
        this.filteredPeople = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erreur lors du chargement des données.';
        this.loading = false;
      }
    });
  }

  loadAuthUsers() {
    this.dbService.getAuthUsersInfo().subscribe({
      next: (data) => {
        this.authUsers = data;
        this.filteredAuthUsers = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs auth:', err);
      }
    });
  }

  filterPeople() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredPeople = this.peopleWithAccounts;
    } else {
      this.filteredPeople = this.peopleWithAccounts.filter(person => 
        (person.nom?.toLowerCase() || '').includes(term) ||
        (person.prenom?.toLowerCase() || '').includes(term) ||
        (person.email?.toLowerCase() || '').includes(term)
      );
    }
  }

  filterAuthUsers() {
    const term = this.searchAuthTerm.toLowerCase().trim();
    if (!term) {
      this.filteredAuthUsers = this.authUsers;
    } else {
      this.filteredAuthUsers = this.authUsers.filter(user => 
        (user.email?.toLowerCase() || '').includes(term)
      );
    }
    this.currentPage = 1; // Réinitialiser à la première page lors d'une recherche
  }

  get paginatedAuthUsers() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredAuthUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredAuthUsers.length / this.itemsPerPage) || 1;
  }

  changePage(delta: number) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  deleteUser(userId: string) {
    this.userToDeleteId = userId;
    this.showDeleteModal = true;
  }

  onDeleteConfirm() {
    if (this.userToDeleteId) {
      this.dbService.deleteAuthUser(this.userToDeleteId).subscribe({
        next: () => {
          this.authUsers = this.authUsers.filter(u => u.id !== this.userToDeleteId);
          this.filterAuthUsers();
          this.onDeleteCancel();
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          alert('Une erreur est survenue lors de la suppression de l\'utilisateur.');
          this.onDeleteCancel();
        }
      });
    }
  }

  onDeleteCancel() {
    this.showDeleteModal = false;
    this.userToDeleteId = null;
  }

  changePassword(userId: string) {
    this.selectedUserId = userId;
    this.showPasswordModal = true;
  }

  onPasswordModalClose() {
    this.showPasswordModal = false;
    this.selectedUserId = null;
  }

  onPasswordModalSave(event: {userId: string, password: string}) {
    this.dbService.updateAuthUserPassword(event.userId, event.password).subscribe({
      next: () => {
        alert('Mot de passe mis à jour avec succès.');
        this.onPasswordModalClose();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du mot de passe:', err);
        alert('Une erreur est survenue lors de la mise à jour du mot de passe.');
      }
    });
  }
}
