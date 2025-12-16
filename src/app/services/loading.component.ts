import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="loadingService.loading$ | async" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div class="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-3"></div>
        <p class="text-indigo-900 font-medium">Chargement...</p>
      </div>
    </div>
  `
})
export class LoadingComponent {
  constructor(public loadingService: LoadingService) {}
}
