import '../styles/gift-reveal.css';

/** Une ligne compacte; seul l'en-tete Mes recompenses possede une carte. */
export default function GiftCompactRow({title,subtitle,status='locked',detail,children,onOpen,disabled=false}){
 const open=status==='opened', ready=status==='ready';
 const label=open?'Ouvert':ready?'À ouvrir':status==='cancelled'?'Annulé':'Fermé';
 return <article className={`maf-gift-line maf-gift-line--${status}`}>
  <div className="maf-gift-line__main">
   <span className="maf-gift-line__glyph" aria-hidden="true">{open?'✓':ready?'✦':'♢'}</span>
   <div className="maf-gift-line__copy"><strong title={title}>{title}</strong><small>{subtitle}</small></div>
   <span className="maf-gift-line__state"><span aria-hidden="true">{open?'●':ready?'◉':'○'}</span> {label}</span>
   {(ready||open)&&<button type="button" disabled={disabled} onClick={onOpen} aria-label={`${open?'Revoir':'Ouvrir'} le cadeau ${title}`}>{open?'Revoir':'Ouvrir'}</button>}
  </div>
  {(detail||children)&&<details className="maf-gift-line__details"><summary>Détails <span aria-hidden="true">⌄</span></summary><div>{detail}{children}</div></details>}
 </article>;
}
