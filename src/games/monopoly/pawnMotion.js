// Presentation uniquement : aucun changement des regles ou de l'argent.
export const BOARD_SIZE = 20;
export const CAMERA_LEAD = 480;
export const STEP_MS = 230;
export const CAMERA_HOLD = 240;
export const CAMERA_RETURN = 650;
const C = 0.1328, T = (1 - 2 * C) / 9;
export const smooth = t => { const x = Math.max(0, Math.min(1, t)); return x*x*(3-2*x); };
export function squareCenter(index) {
  const i = ((index % 40) + 40) % 40, half = C/2;
  if(i===0)return{x:1-half,y:1-half,side:'corner'};
  if(i<10)return{x:1-C-(i-.5)*T,y:1-half,side:'bottom'};
  if(i===10)return{x:half,y:1-half,side:'corner'};
  if(i<20)return{x:half,y:1-C-(i-10-.5)*T,side:'left'};
  if(i===20)return{x:half,y:half,side:'corner'};
  if(i<30)return{x:C+(i-20-.5)*T,y:half,side:'top'};
  if(i===30)return{x:1-half,y:half,side:'corner'};
  return{x:1-half,y:C+(i-30-.5)*T,side:'right'};
}
export function squarePosition(i) { const c=squareCenter(i); return {x:(c.x-.5)*BOARD_SIZE,z:(c.y-.5)*BOARD_SIZE}; }
export function pickSquare(x,z) {
 const u=x/BOARD_SIZE+.5,v=z/BOARD_SIZE+.5;
 if(u<0||u>1||v<0||v>1)return null;
 for(let i=0;i<40;i++){
  const c=squareCenter(i),w=(c.side==='left'||c.side==='right'||c.side==='corner')?C:T,h=(c.side==='bottom'||c.side==='top'||c.side==='corner')?C:T;
  if(Math.abs(u-c.x)<=w/2&&Math.abs(v-c.y)<=h/2)return i;
 }
 return null;
}
export function planTravel(from,to,rollTotal=null) {
 const points=[squarePosition(from)],durations=[];
 const steps=Number.isInteger(rollTotal)&&rollTotal>=1&&rollTotal<=12?rollTotal:(to-from+40)%40;
 if(steps<=12){for(let k=1;k<=steps;k++){points.push(squarePosition((from+k)%40));durations.push(STEP_MS);}}
 // Prison/cartes : aller jusqu'a la case du lancer, puis rejoindre la destination reelle.
 const last=Number.isInteger(rollTotal)?(from+rollTotal)%40:(from+steps)%40;
 if(last!==to||steps>12){points.push(squarePosition(to));durations.push(520);}
 const moveDuration=durations.reduce((a,b)=>a+b,0);
 return {points,durations,moveDuration,duration:CAMERA_LEAD+moveDuration+CAMERA_HOLD+CAMERA_RETURN};
}
export function sampleTravel(plan,elapsed) {
 const moveTime=Math.max(0,elapsed-CAMERA_LEAD);let remain=moveTime,part=0;
 while(part<plan.durations.length&&remain>=plan.durations[part]){remain-=plan.durations[part];part++;}
 const a=plan.points[Math.min(part,plan.points.length-1)],b=plan.points[Math.min(part+1,plan.points.length-1)];
 const k=part<plan.durations.length?smooth(remain/plan.durations[part]):1;
 const moving=elapsed>=CAMERA_LEAD&&moveTime<plan.moveDuration;
 let focus=smooth(elapsed/CAMERA_LEAD);
 const returning=elapsed-(CAMERA_LEAD+plan.moveDuration+CAMERA_HOLD);
 if(returning>=0)focus=1-smooth(returning/CAMERA_RETURN);
 return{x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,focus,tilt:moving?Math.sin(k*Math.PI)*.1:0,moving,done:elapsed>=plan.duration};
}
