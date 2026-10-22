import { syncWallet } from './accounts';

const tasks = new Set();
let pending = null;
// Les futures vues multijoueurs peuvent inscrire leur lecture serveur ici.
export function registerRefresh(task) {
  tasks.add(task);
  return () => tasks.delete(task);
}
export function refreshData() {
  if (pending) return pending;
  pending = Promise.allSettled([syncWallet(), ...Array.from(tasks, task => Promise.resolve().then(task))])
    .then(results => {
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    }).finally(() => { pending = null; });
  return pending;
}
