export const francs = value => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} F`;
export const abidjanDate = value => new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Abidjan', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));
export function countdown(target, now) {
  const seconds = Math.max(0, Math.ceil((Date.parse(target) - now) / 1000));
  return [Math.floor(seconds/86400), Math.floor(seconds/3600)%24, Math.floor(seconds/60)%60, seconds%60];
}
// Abidjan est UTC+0 : ne pas laisser le fuseau de l'appareil deplacer l'heure saisie.
export const dateInput = value => new Date(value).toISOString().slice(0,16);
export function dateFromInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Renseigne les deux dates et heures.');
  const date = new Date(`${value}:00.000Z`);
  if (!Number.isFinite(date.getTime()) || dateInput(date) !== value) throw new Error('Date invalide.');
  return date.toISOString();
}
export function newTournament(now = Date.now()) {
  const start = new Date(now); start.setUTCHours(19,0,0,0);
  start.setUTCDate(start.getUTCDate() + ((5-start.getUTCDay()+7)%7));
  if (start.getTime() <= now) start.setUTCDate(start.getUTCDate()+7);
  return { title:'Grand tournoi Monopoly', description:'De 10 à 20 joueurs, de deux à quatre plateaux et une grande finale.',
    startsAt:dateInput(start), finalAt:dateInput(start.getTime()+65*60000), status:'draft',
    participantSkinId:'', winnerSkinId:'' };
}
