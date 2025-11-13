import { Routes } from '@angular/router';
import { AccueilComponent } from '../app/pages/accueil/accueil.component';
import { FormAutoComponent } from './pages/form-auto/form-auto.component';
import { FormHabitationComponent } from './pages/form-habitation/form-habitation.component';
import { FormRcComponent } from './pages/form-rc/form-rc.component';
import { ObsequesComponent } from './pages/obseques/obseques.component';
import { AssuranceJuridiqueComponent } from './pages/assurance-juridique/assurance-juridique.component';
import { AssuranceVoyageComponent } from './pages/assurance-voyage/assurance-voyage.component';
import { MentionsLegalesComponent } from './pages/mentions-legales/mentions-legales.component';
import { FormContactComponent } from './pages/form-contact/form-contact.component';

export const routes: Routes = [
    { path: 'accueil', component: AccueilComponent },
    { path: 'contact', component: FormContactComponent },
    { path: 'particulier/auto', component: FormAutoComponent },
    { path: 'particulier/habitation', component: FormHabitationComponent },
    { path: 'particulier/rc-familale', component: FormRcComponent },
    { path: 'particulier/obseques', component: ObsequesComponent },
    { path: 'particulier/protection-juridique', component: AssuranceJuridiqueComponent },
    { path: 'particulier/annulation-voyage', component: AssuranceVoyageComponent },
    { path: 'mentions-legales', component: MentionsLegalesComponent },

    { path: '', redirectTo: 'accueil', pathMatch: 'full' },
];
