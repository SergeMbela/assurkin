import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-stat',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './stat.component.html',
  styleUrl: './stat.component.css'
})
export class StatComponent {
  activeTab: string = 'prospects';
}
