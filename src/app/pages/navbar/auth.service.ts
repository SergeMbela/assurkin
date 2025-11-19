import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Utilise un BehaviorSubject pour que les composants puissent s'abonner aux changements d'état.
  // Mettez `true` ici pour simuler un utilisateur connecté.
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor() { }

  // Méthodes pour simuler la connexion/déconnexion
  login() { this.isLoggedInSubject.next(true); }
  logout() { this.isLoggedInSubject.next(false); }
}