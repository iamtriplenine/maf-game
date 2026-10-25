import { useLayoutEffect } from 'react';
// Reserve la premiere vue au plateau et aux commandes. Le journal vient apres.
export default function useMonopolyViewport(active, screenRef, consoleRef) {
 useLayoutEffect(()=>{
  if(!active||!screenRef.current)return undefined;
  const screen=screenRef.current,consoleEl=consoleRef.current;
  const main=screen.closest('.game-page')||screen;
  let frame=0;
  const measure=()=>{
   const viewport=window.visualViewport?.height||window.innerHeight;
   const dock=document.querySelector('.dock');
   const dockHeight=dock?Math.max(0,viewport-dock.getBoundingClientRect().top):0;
   const offset=Math.max(0,screen.getBoundingClientRect().top-main.getBoundingClientRect().top);
   const available=Math.max(240,Math.floor(viewport-offset-dockHeight-5));
   const commands=consoleEl?.getBoundingClientRect().height||150;
   screen.style.setProperty('--mono-screen-height',`${available}px`);
   screen.style.setProperty('--mono-board-limit',`${Math.max(110,available-commands-8)}px`);
   screen.parentElement.style.setProperty('--mono-dock-space',`${dockHeight}px`);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(schedule);observer.observe(main);if(consoleEl)observer.observe(consoleEl);
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
  frame=requestAnimationFrame(()=>{main.scrollIntoView({block:'start',behavior:'instant'});measure();schedule();});
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);};
 },[active,screenRef,consoleRef]);
}
