// Collection des fonds publics du profil. Ajoute les futurs fonds ici.
export const DEFAULT_PROFILE_BACKGROUND = 'classic';
export const PROFILE_BACKGROUNDS = Object.freeze([
  { id: 'matrix-rain', name: 'Pluie Matrix', access: 'exclusive', description: 'Arriere-plan exclusif a recevoir dans les cadeaux.' },
  { id: 'classic', name: 'Classique', access: 'public', description: 'Le decor original, sans animation supplementaire.' },
]);
export function validProfileBackground(id) {
  return PROFILE_BACKGROUNDS.some((item) => item.id === id) ? id : DEFAULT_PROFILE_BACKGROUND;
}
export function readGuestProfileBackground() {
  // Aucun droit de cadeau sur les comptes invites.
  return DEFAULT_PROFILE_BACKGROUND;
}
export function saveGuestProfileBackground(id) {
  const value = DEFAULT_PROFILE_BACKGROUND;
  try { localStorage.setItem('maf-guest-profile-background', value); } catch { /* stockage facultatif */ }
  return value;
}
