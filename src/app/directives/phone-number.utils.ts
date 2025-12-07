export function formatBelgianPhoneNumber(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  // Supprimer tous les caractères non numériques
  let rawValue = String(value).replace(/\D/g, '');

  // Supprimer le code pays '32' s'il est présent
  if (rawValue.startsWith('32')) {
    rawValue = rawValue.substring(2);
  }
  // Supprimer le '0' initial s'il est présent (pour les numéros belges locaux comme 0487...)
  if (rawValue.startsWith('0')) {
    rawValue = rawValue.substring(1);
  }

  // Limiter le numéro local à 9 chiffres (format mobile/fixe belge après code pays et zéro initial)
  const localNumber = rawValue.substring(0, 9);

  if (localNumber.length === 0) {
      return ''; // Retourne une chaîne vide si aucun chiffre n'est présent
  }

  let formatted = '+32';

  formatted += ' ';
  // Groupe 1: 3 chiffres (ex: 487)
  if (localNumber.length > 0) {
    formatted += localNumber.substring(0, 3);
  }
  // Groupe 2: 2 chiffres (ex: 75)
  if (localNumber.length > 3) {
    formatted += ' ';
    formatted += localNumber.substring(3, 5);
  }
  // Groupe 3: 2 chiffres (ex: 71)
  if (localNumber.length > 5) {
    formatted += ' ';
    formatted += localNumber.substring(5, 7);
  }
  // Groupe 4: 2 chiffres (ex: 15)
  if (localNumber.length > 7) {
    formatted += ' ';
    formatted += localNumber.substring(7, 9);
  }

  return formatted;
}