import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mentions-legales.component.html',
  styleUrl: './mentions-legales.component.css'
})
export class MentionsLegalesComponent {
  email: string = 'info@assurkin.be';
  activeTab: string = 'vue-ensemble';
}
