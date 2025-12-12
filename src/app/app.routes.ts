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
import { AccountPasswordLostComponent } from "./pages/account-password-lost/account-password-lost.component";
import { AccountPasswordResetComponent } from "./pages/account-password-reset/account-password-reset.component";
import { authGuard } from './auth.guard';
import { CreateuseraccountComponent } from './pages/createuseraccount/createuseraccount.component';
//Page details assurance
import { DetailsAssuranceComponent } from './pages/details-assurance/details-assurance.component';
import { DashboardComponent } from './pages/intranet/dashboard/dashboard.component';
import { AutoManagementComponent } from './pages/intranet/dashboard/auto-management.component';
import { ManagementComponent } from './pages/management/management.component';
import { AssurancesDetailsComponent } from './pages/assurances-details/assurances-details.component';
import { ManagementDetailComponent } from './pages/management/management-detail.component';
import { CorporateComponent } from './pages/corporate/corporate.component';

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
    { path: 'mentions', component: MentionsLegalesComponent },
    { path: 'corporate', component: CorporateComponent },

    // Routes pour les utilitaires (à créer)
    { path: 'utilities/paiements', loadComponent: () => import('./utilities/payment/payment.component').then(m => m.PaymentComponent) },
    { path: 'utilities/statistiques', loadComponent: () => import('./utilities/stat/stat.component').then(m => m.StatComponent) },
    { path: 'utilities/prospects', loadComponent: () => import('./utilities/rs/rs.component').then(m => m.RsComponent) },
    { path: 'utilities/parametres', loadComponent: () => import('./utilities/params/params.component').then(m => m.ParamsComponent) },

    // Nouvelles routes pour l'authentification
    { path: 'account', component: AccountComponent },
    { path: 'login', component: AccountLoginComponent },
    { path: 'create-account', component: AccountCreationComponent },
    { path: 'lost-password', component: AccountPasswordLostComponent },
    { path: 'reset-password', component: AccountPasswordResetComponent },
    { path: 'mydata', component: MydataComponent, canActivate: [authGuard] },
    { path: 'createuseraccount', component: CreateuseraccountComponent },
    // Détails assurance (le :id est un paramètre dynamique)
    // Les anciennes routes sont conservées pour la compatibilité mais redirigent vers la nouvelle route centralisée.
    { path: 'assurance_auto/:id', redirectTo: 'assurance-details/auto/:id' },
    { path: 'assurance_habitation/:id', redirectTo: 'assurance-details/habitation/:id' },
    { path: 'assurance_obseques/:id', redirectTo: 'assurance-details/obseques/:id' },
    // Dashboard intranet
    { path: 'intranet/dashboard', component: DashboardComponent },
    { path: 'intranet/gestion-auto', component: AutoManagementComponent },
    { path: 'management', component: ManagementComponent },
    { path: 'management/:type/:id', component: ManagementDetailComponent }, // Route pour l'édition détaillée
    { path: 'management/upload/:type/:id/:preneurId', loadComponent: () => import('./pages/uploader/uploader.component').then(m => m.UploaderComponent) },
    // La navigation vers les détails se fait par programmation depuis management.component.ts
    { path: 'assurance-details/:type/:id', component: AssurancesDetailsComponent }, // Route pour les détails depuis la gestion
    { path: 'messagerie/:type/:id', loadComponent: () => import('./pages/messagerie/messagerie.component').then(m => m.MessagerieComponent) },
    { path: 'management/assurance-details/:type/:id', loadComponent: () => import('./pages/assurances-details/assurances-details.component').then(m => m.AssurancesDetailsComponent) },

    // Redirections
    { path: '', redirectTo: 'accueil', pathMatch: 'full' }, // Redirige la racine vers l'accueil
    { path: '**', redirectTo: 'accueil' },// Redirige les routes inconnues vers l'accueil
];
