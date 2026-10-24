// Le mode proprietaire existant reste inchange.
// Les codes temporaires sont egalement utilisables dans les matchs a deux; le serveur valide leur application.
import { currentSession, walletRequest } from '../api/accounts';
const KEY = 'maf-owner-win-mode';
const ACCESS_KEY = 'maf-win-solo-access';
const event = () => window.dispatchEvent(new Event('maf:winmode'));
const readGrant = () => {
  try {
    const grant = JSON.parse(sessionStorage.getItem(ACCESS_KEY));
    return grant && grant.user_id === currentSession()?.id ? grant : null;
  } catch { return null; }
};
export function setWinGrant(grant) {
  try {
    if (grant?.active && currentSession()?.id) {
      sessionStorage.setItem(ACCESS_KEY,JSON.stringify({
        ...grant,user_id:currentSession().id,playing:null,
      }));
    } else sessionStorage.removeItem(ACCESS_KEY);
  } catch { /* sessionStorage peut etre desactive */ }
  event();
}
// Ne pas reutiliser une session de partie unique apres un rechargement complet.
try {
  const saved = JSON.parse(sessionStorage.getItem(ACCESS_KEY));
  if (saved?.playing) sessionStorage.setItem(ACCESS_KEY,JSON.stringify({...saved,playing:null}));
} catch { /* facultatif */ }
export function winModeIsEnabled(game = null, solo = false) {
  if (currentSession()?.pseudo === '999') {
    try { if (sessionStorage.getItem(KEY) === '1') return true; }
    catch { /* facultatif */ }
  }
  if (!['tank','penalty'].includes(game)) return false;
  const grant = readGrant();
  return !!grant && new Date(grant.expires_at).getTime() > Date.now() &&
    (grant.game === 'all' || grant.game === game) &&
    (grant.kind === 'duration' || (solo ? grant.playing === game :
      grant.matches_left === 1 || grant.matches_left === 0));
}
// La boule signale toute autorisation Win encore valide pour ce joueur,
// sans limiter l'indicateur au compte proprietaire ou a un jeu donne.
export function winModeIndicatorIsEnabled() {
  if (currentSession()?.pseudo === '999') {
    try { if (sessionStorage.getItem(KEY) === '1') return true; }
    catch { /* facultatif */ }
  }
  const grant = readGrant();
  if (!grant || !Number.isFinite(Date.parse(grant.expires_at)) ||
      Date.parse(grant.expires_at) <= Date.now()) return false;
  return grant.kind === 'duration' ||
    (grant.kind === 'match' && (grant.matches_left === 1 || !!grant.playing));
}

// Un coupon "une partie" cesse d'allumer la boule a la fin du duel concerne.
// Les coupons a duree et le mode proprietaire restent inchanges.
export function finishWinRoomMatch(game) {
  if (!['tank','penalty'].includes(game)) return;
  const grant = readGrant();
  if (!grant || grant.kind !== 'match' ||
      (grant.game !== 'all' && grant.game !== game) ||
      grant.matches_left !== 1) return;
  try {
    sessionStorage.setItem(ACCESS_KEY, JSON.stringify({...grant, matches_left: 0, playing: null}));
  } catch { /* stockage facultatif */ }
  event();
}

export function setWinModeActive(active) {
  if (currentSession()?.pseudo !== '999') return false;
  try { sessionStorage.setItem(KEY, active ? '1' : '0'); } catch { /* facultatif */ }
  event();
  return !!active;
}
export async function beginWinSoloMatch(game) {
  const grant = readGrant();
  if (!grant || !['tank','penalty'].includes(game) ||
      (grant.game !== 'all' && grant.game !== game) ||
      new Date(grant.expires_at).getTime() <= Date.now()) return false;
  try {
    await walletRequest('/api/win-practice/start', {
      method:'POST',body:{code:grant.code,game},
    });
    const next = {...grant,playing:grant.kind === 'match' ? game : null,
      matches_left:grant.kind === 'match' ? 0 : grant.matches_left};
    sessionStorage.setItem(ACCESS_KEY,JSON.stringify(next));
    event();
    return true;
  } catch {
    event();
    return false;
  }
}
export function finishWinSoloMatch(game) {
  try {
    const grant = readGrant();
    if (grant?.playing === game) {
      sessionStorage.setItem(ACCESS_KEY,JSON.stringify({...grant,playing:null}));
      event();
    }
  } catch { /* facultatif */ }
}
export function onWinModeChange(callback) {
  window.addEventListener('maf:winmode',callback);
  window.addEventListener('maf:session',callback);
  // Une duree de 1 minute doit s'arreter meme sans rechargement de la page.
  const interval = window.setInterval(callback,1000);
  return () => {
    window.removeEventListener('maf:winmode',callback);
    window.removeEventListener('maf:session',callback);
    window.clearInterval(interval);
  };
}
