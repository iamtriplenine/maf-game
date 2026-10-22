// Basculement local du bouton : l'acces aux donnees de tir est TOUJOURS controle par le serveur.
import { currentSession } from '../api/accounts';
const KEY = 'maf-owner-win-mode';
export const winModeIsEnabled = () => {
  if (currentSession()?.pseudo !== '999') return false;
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};
export function setWinModeActive(active) {
  if (currentSession()?.pseudo !== '999') return false;
  try { sessionStorage.setItem(KEY, active ? '1' : '0'); } catch { /* facultatif */ }
  window.dispatchEvent(new Event('maf:winmode'));
  return !!active;
}
export function onWinModeChange(callback) {
  window.addEventListener('maf:winmode',callback);
  window.addEventListener('maf:session',callback);
  return () => { window.removeEventListener('maf:winmode',callback); window.removeEventListener('maf:session',callback); };
}
