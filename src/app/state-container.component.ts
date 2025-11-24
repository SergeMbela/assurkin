import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataState } from './data-state.model';

@Component({
  selector: 'app-state-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="true">
      <!-- État de chargement -->
      <ng-container *ngSwitchCase="state.loading">
        <div class="flex justify-center items-center p-10">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="ml-4 text-gray-600">{{ loadingMessage }}</p>
        </div>
      </ng-container>

      <!-- État d'erreur -->
      <ng-container *ngSwitchCase="!!state.error">
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
          <strong class="font-bold">Erreur !</strong>
          <span class="block sm:inline"> {{ errorMessage }}</span>
        </div>
      </ng-container>

      <!-- Contenu principal (succès) -->
      <ng-container *ngSwitchDefault>
        <ng-content></ng-content>
      </ng-container>
    </ng-container>
  `
})
export class StateContainerComponent {
  @Input() state!: DataState<any>;
  @Input() loadingMessage: string = 'Chargement...';
  @Input() errorMessage: string = 'Une erreur est survenue lors du chargement des données.';
}