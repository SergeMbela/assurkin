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
// Importez les nouveaux composants depuis leur nouvel emplacement
import { AccountLoginComponent } from './pages/account-login/account-login.component';
import { AccountComponent } from './pages/account/account.component';
import { AccountCreationComponent } from './pages/account-creation/account-creation.component';
import { MydataComponent } from './pages/mydata/mydata.component';
import {AccountPasswordLostComponent} from "./pages/account-password-lost/account-password-lost.component";
import {AccountPasswordResetComponent} from "./pages/account-password-reset/account-password-reset.component";
import { authGuard } from './auth.guard';
import { CreateuseraccountComponent } from './pages/createuseraccount/createuseraccount.component';
//Page details assurance
import { DetailsAssuranceComponent } from './pages/details-assurance/details-assurance.component';

export const routes: Routes = [
    
    // Routes existantes
    { path: 'accueil', component: AccueilComponent },
    { path: 'contact', component: FormContactComponent },
    { path: 'particulier/auto', component: FormAutoComponent },
    { path: 'particulier/habitation', component: FormHabitationComponent },
    { path: 'particulier/rc-familale', component: FormRcComponent },
    { path: 'particulier/obseques', component: ObsequesComponent },
    { path: 'particulier/protection-juridique', component: AssuranceJuridiqueComponent },
    { path: 'particulier/annulation-voyage', component: AssuranceVoyageComponent },
    { path: 'mentions-legales', component: MentionsLegalesComponent },

    // Nouvelles routes pour l'authentification
    { path: 'account', component: AccountComponent },
    { path: 'login', component: AccountLoginComponent },
    { path: 'create-account', component: AccountCreationComponent },
    { path: 'lost-password', component: AccountPasswordLostComponent },
    { path: 'reset-password', component: AccountPasswordResetComponent },
    { path: 'mydata', component: MydataComponent, canActivate: [authGuard] },
    { path: 'createuseraccount', component: CreateuseraccountComponent },
   // Détails assurance (le :id est un paramètre dynamique)
   { path: 'assurance_auto/:id', component: DetailsAssuranceComponent },
   { path: 'assurance_habitation/:id', component: DetailsAssuranceComponent }, // Route pour les détails habitation
   { path: 'assurance_obseques/:id', component: DetailsAssuranceComponent },
    // Redirections
    { path: '', redirectTo: 'accueil', pathMatch: 'full' }, // Redirige la racine vers l'accueil
    { path: '**', redirectTo: 'accueil' } ,// Redirige les routes inconnues vers l'accueil
];
