import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./pages/navbar/navbar.component";
import { FooterComponent } from './pages/footer/footer.component';
import { NetworkStatusComponent } from './network-status.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NetworkStatusComponent],
  templateUrl: './app.component.html',
  styles: [':host { display: flex; flex-direction: column; min-height: 100vh; } main { flex: 1; }']
})
export class AppComponent {
  title = 'Bienvenue chez Assurkin';
}
