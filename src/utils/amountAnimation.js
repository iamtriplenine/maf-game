export const amountValue=value=>Number.isFinite(Number(value))?Math.round(Number(value)):0;
export const amountDuration=(from,to)=>Math.min(1150,350+Math.log2(Math.abs(to-from)+1)*55);
export function countAt(from,to,progress){
 const t=Math.max(0,Math.min(1,progress));
 return t===1?to:Math.round(from+(to-from)*(1-(1-t)**3));
}
