// Sons courts produits localement : aucun fichier reseau ni modification du jeu.
let context=null,muted=false;
try{muted=sessionStorage.getItem('maf:monopoly:muted')==='1';}catch{/* facultatif */}
const sounds={
 step:[[130,0,.04,.035],[88,.035,.045,.025]],
 rent:[[880,0,.07,.055],[1174,.07,.09,.045],[1568,.15,.13,.035]],
 go:[[523,0,.09,.045],[659,.09,.09,.045],[784,.18,.17,.04]],
};
export function soundForEvent(event){return event?.kind==='rent-paid'?'rent':['go-pass','go-reward'].includes(event?.kind)?'go':null;}
export function soundIsMuted(){return muted;}
export function setSoundMuted(value){muted=!!value;try{sessionStorage.setItem('maf:monopoly:muted',muted?'1':'0');}catch{/* facultatif */}}
export function unlockSound(){
 if(muted)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  context||=new Audio();
  if(context.state==='suspended')void context.resume().catch(()=>{});
 }catch{/* Audio indisponible : la partie continue normalement. */}
}
export function playSound(kind){
 if(muted||document.hidden||!context||context.state!=='running'||!sounds[kind])return;
 try{
  for(const [frequency,delay,duration,volume] of sounds[kind]){
   const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+delay;
   oscillator.type=kind==='step'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+duration+.01);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
 }catch{/* Un son ne doit jamais interrompre une action. */}
}
