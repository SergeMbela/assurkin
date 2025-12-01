import { Assureur } from "../../../../services/db-connect.service";

export function getStatutClass(statut: string | null | undefined): { [key: string]: boolean } {
  if (!statut) {
    return { 'bg-gray-100': true, 'text-gray-800': true };
  }
  switch (statut) {
    case 'Nouveau':
    case 'En cours de traitement':
      return { 'bg-blue-100': true, 'text-blue-800': true };
    case 'En attente':
    case 'En cours':
      return { 'bg-yellow-100': true, 'text-yellow-800': true };
    case 'Terminé':
      return { 'bg-green-100': true, 'text-green-800': true };
    case 'Refusé':
    case 'Inactif':
      return { 'bg-red-100': true, 'text-red-800': true };
    default:
      return { 'bg-gray-100': true, 'text-gray-800': true }; // Classe par défaut
  }
}

export function getCompanyName(companyId: number, companies: Assureur[]): string {
  if (!companyId || !companies || companies.length === 0) {
    return 'N/A';
  }
  const company = companies.find(c => c.id === companyId);
  return company ? company.nom : `Inconnue (ID: ${companyId})`;
}