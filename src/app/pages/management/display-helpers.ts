import { Assureur } from '../../services/db-connect.service';

/**
 * Retourne le nom de la compagnie d'assurance à partir de son ID.
 * @param companyId L'ID de la compagnie.
 * @param insuranceCompanies La liste complète des compagnies d'assurance.
 * @returns Le nom de la compagnie ou 'Non spécifiée'/'Inconnue'.
 */
export function getCompanyName(companyId: number | null | undefined, insuranceCompanies: Assureur[]): string {
  if (!companyId || !insuranceCompanies || insuranceCompanies.length === 0) {
    return 'Non spécifiée';
  }
  const company = insuranceCompanies.find(c => c.id === companyId);
  return company ? company.nom : `Inconnue (ID: ${companyId})`;
}

/**
 * Retourne les classes CSS Tailwind pour styliser le statut.
 * @param statut Le statut du devis.
 * @returns Un objet de classes CSS.
 */
export function getStatutClass(statut: string | null | undefined): { [key: string]: boolean } {
  if (!statut) return { 'bg-gray-100': true, 'text-gray-800': true };
  switch (statut) {
    case 'Nouveau': case 'En cours de traitement': return { 'bg-blue-100': true, 'text-blue-800': true };
    case 'En attente': case 'En cours': return { 'bg-yellow-100': true, 'text-yellow-800': true };
    case 'Terminé': return { 'bg-green-100': true, 'text-green-800': true };
    case 'Refusé': case 'Inactif': return { 'bg-red-100': true, 'text-red-800': true };
    default: return { 'bg-gray-100': true, 'text-gray-800': true };
  }
}