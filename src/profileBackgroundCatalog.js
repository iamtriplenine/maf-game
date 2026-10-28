// Collection des fonds publics du profil. Ajoute les futurs fonds ici.
export const DEFAULT_PROFILE_BACKGROUND = 'matrix-rain';
export const PROFILE_BACKGROUNDS = Object.freeze([
  { id: 'matrix-rain', name: 'Pluie Matrix', description: 'Ecritures japonaises animees, adaptees au theme bleu ou rose.' },
  { id: 'classic', name: 'Classique', description: 'Le decor original, sans animation supplementaire.' },
]);
export function validProfileBackground(id) {
  return PROFILE_BACKGROUNDS.some((item) => item.id === id) ? id : DEFAULT_PROFILE_BACKGROUND;
}
export function readGuestProfileBackground() {
  try { return validProfileBackground(localStorage.getItem('maf-guest-profile-background')); }
  catch { return DEFAULT_PROFILE_BACKGROUND; }
}
export function saveGuestProfileBackground(id) {
  const value = validProfileBackground(id);
  try { localStorage.setItem('maf-guest-profile-background', value); } catch { /* stockage facultatif */ }
  return value;
}
