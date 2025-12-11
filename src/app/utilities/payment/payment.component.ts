import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule, // Pour ngClass, ngSwitch, etc.
    RouterModule  // Pour routerLink
  ],
  templateUrl: './payment.component.html',
  // styleUrl: './payment.component.css'
})
export class PaymentComponent {
  public activeTab: 'data' | 'chart' = 'data';
}