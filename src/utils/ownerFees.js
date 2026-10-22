// Apercu seulement : le serveur controle et enregistre les montants.
import { feeFor } from './walletFees';
export function withdrawalFees(amount) {
  const fee_amount=feeFor(amount);
  const owner_fee_amount=Math.ceil(amount*19/100)-fee_amount;
  return {fee_amount,owner_fee_amount,total_amount:amount+fee_amount+owner_fee_amount};
}
