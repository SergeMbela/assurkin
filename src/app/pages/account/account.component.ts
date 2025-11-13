import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-center mb-8">Votre Espace Client</h1>
      <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <div class="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 class="text-2xl font-semibold mb-4">Nouveau Client ?</h2>
          <p class="text-gray-600 mb-6">Créez un compte pour accéder à tous nos services en ligne et gérer vos contrats facilement.</p>
          <a routerLink="/create-account" class="inline-block bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition duration-300">
            Créer votre compte
          </a>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 class="text-2xl font-semibold mb-4">Déjà Client ?</h2>
          <p class="text-gray-600 mb-6">Connectez-vous à votre espace pour consulter vos informations personnelles et vos contrats.</p>
          <a routerLink="/login" class="inline-block bg-gray-800 text-white font-bold py-2 px-4 rounded hover:bg-gray-900 transition duration-300">
            Authentifiez-vous
          </a>
          <a routerLink="/lost-password" class="block text-sm text-indigo-600 hover:underline mt-4">
            Mot de passe perdu ?
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrl: './account.component.css'
})
export class AccountComponent {

}
