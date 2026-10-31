// Apercu seulement : le serveur controle et enregistre les montants.
import { feeFor } from './walletFees.js';
export function withdrawalFees(amount, currency = 'F') {
  const fee_amount=feeFor(amount);
  if (!['F','V'].includes(currency)) throw new RangeError('Devise de retrait invalide.');
  const owner_fee_amount=currency === 'V' ? 0 : Math.ceil(amount*19/100)-fee_amount;
  return {fee_amount,owner_fee_amount,total_amount:amount+fee_amount+owner_fee_amount};
}
