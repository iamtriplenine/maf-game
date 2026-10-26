import {useEffect,useRef,useState} from 'react';
import {amountValue,amountDuration,countAt} from '../utils/amountAnimation';
import '../styles/animated-amount.css';
const memory=new Map();
function read(key,fallback){
 if(!key)return fallback;
 if(memory.has(key))return memory.get(key);
 try{const v=sessionStorage.getItem('maf:amount:'+key);if(v!==null&&Number.isFinite(Number(v)))return amountValue(v);}catch{/* facultatif */}
 return fallback;
}
function save(key,value){
 if(!key)return;
 memory.set(key,value);
 try{sessionStorage.setItem('maf:amount:'+key,String(value));}catch{/* facultatif */}
}
const format=value=>new Intl.NumberFormat('fr-CI').format(value);
function Counter({value,cacheKey,formatter=format,suffix='',className=''}){
 const target=amountValue(value);
 const [shown,setShown]=useState(()=>read(cacheKey,target));
 const [direction,setDirection]=useState(0);
 const [visible,setVisible]=useState(()=>!document.hidden);
 const current=useRef(shown),frame=useRef(0);
 useEffect(()=>{
  const change=()=>{if(document.hidden)save(cacheKey,current.current);setVisible(!document.hidden);};
  document.addEventListener('visibilitychange',change);
  return()=>document.removeEventListener('visibilitychange',change);
 },[cacheKey]);
 useEffect(()=>{
  if(!visible)return undefined;
  const from=current.current;
  if(from===target){setDirection(0);save(cacheKey,target);return undefined;}
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced){current.current=target;setShown(target);setDirection(0);save(cacheKey,target);return undefined;}
  setDirection(target>from?1:-1);
  const start=performance.now(),duration=amountDuration(from,target);
  const tick=now=>{
   const progress=Math.min(1,(now-start)/duration),next=countAt(from,target,progress);
   current.current=next;memory.set(cacheKey,next);setShown(next);
   if(progress<1)frame.current=requestAnimationFrame(tick);
   else{setDirection(0);save(cacheKey,target);}
  };
  frame.current=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame.current);save(cacheKey,current.current);};
 },[target,cacheKey,visible]);
 useEffect(()=>()=>save(cacheKey,current.current),[cacheKey]);
 return <span className={`amount-count${direction>0?' amount-count--up':direction<0?' amount-count--down':''}${className?' '+className:''}`}
   aria-label={`${formatter(target)}${suffix}`} aria-busy={direction!==0} data-direction={direction>0?'up':direction<0?'down':'idle'}>{formatter(shown)}{suffix}</span>;
}
export default function AnimatedAmount(props){return <Counter key={props.cacheKey||'uncached'} {...props}/>;}
