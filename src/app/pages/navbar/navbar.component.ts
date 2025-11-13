import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  menuOpen = false;
  showParticulierSubMenu = false; // Pour le menu desktop
  particulierSubMenuOpen = false; // Pour le menu mobile
  showProfessionelSubMenu = false; // Pour le menu desktop
  professionelSubMenuOpen = false; // Pour le menu mobile

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
