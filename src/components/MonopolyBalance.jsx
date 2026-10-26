import AnimatedAmount from './AnimatedAmount';
export default function MonopolyBalance({player,gameKey}){
 if(!player)return null;
 const change=player.lastTransaction?.amount;
 return <span className="mono-balance">
  {Number.isFinite(change)&&change!==0&&<span className={`mono-balance__delta mono-balance__delta--${change>0?'up':'down'}`} aria-label={`Dernière transaction : ${change>0?'+':''}${change} dollars`}>{change>0?'+':'−'}{new Intl.NumberFormat('fr-CI').format(Math.abs(change))}</span>}
  <AnimatedAmount value={player.balance} cacheKey={`monopoly:${gameKey}:${player.id}`} suffix=" $"/>
 </span>;
}
