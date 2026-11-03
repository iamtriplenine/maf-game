// Horaires officiels du salon : 5 min de pre-ouverture et 5 min d attente initiale.
export const PENALTY_EARLY_ACCESS_MS = 5 * 60 * 1000;
export const PENALTY_ARRIVAL_GRACE_MS = 5 * 60 * 1000;
export const PENALTY_LATE_LIMIT_MS = 10 * 60 * 1000;
export function penaltyJoinWindow(duel, now = Date.now()) {
  if (!duel) return null;
  const scheduledAt = Date.parse(duel.scheduledAt);
  if (!Number.isFinite(scheduledAt) || !Number.isFinite(now)) return null;
  const status = duel.status;
  const startSeconds = Math.max(0, Math.ceil((scheduledAt - now) / 1000));
  const deadlineSeconds = Math.max(0, Math.ceil((scheduledAt + PENALTY_ARRIVAL_GRACE_MS - now) / 1000));
  if (status === 'finished') return {phase:'finished',canEnter:true,startSeconds,deadlineSeconds};
  if (status === 'attention') return {phase:'attention',canEnter:false,startSeconds,deadlineSeconds};
  if (status === 'playing') return {phase:'playing',canEnter:true,startSeconds,deadlineSeconds};
  if (now < scheduledAt - PENALTY_EARLY_ACCESS_MS) return {phase:'closed',canEnter:false,startSeconds,deadlineSeconds};
  if (now < scheduledAt) return {phase:'early',canEnter:true,startSeconds,deadlineSeconds};
  if (deadlineSeconds > 0) return {phase:'waiting',canEnter:true,startSeconds,deadlineSeconds};
  // De 5 a 10 minutes : le serveur accepte encore le joueur tant que son adversaire n'est pas present.
  const lateSeconds = Math.max(0, Math.ceil((scheduledAt + PENALTY_LATE_LIMIT_MS - now) / 1000));
  if (lateSeconds > 0) return {phase:'late',canEnter:true,startSeconds,deadlineSeconds,lateSeconds};
  return {phase:'decision',canEnter:false,startSeconds,deadlineSeconds};
}
export function penaltyClock(seconds) {
  const s=Math.max(0,Math.floor(Number(seconds)||0));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}
