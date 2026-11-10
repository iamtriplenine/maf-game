/* Moteur 3D WebGL2 minimal, sans bibliothèque, CDN ni connexion serveur.
 * Toutes les formes sont de vraies géométries 3D affichées par la carte graphique.
 * Matrices en column-major, coordonnées Y vertical. */
(function(){'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const rgb=(s)=>{if(Array.isArray(s))return s; let n=parseInt(s.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
 function shade(col,k){let c=rgb(col);return c.map(v=>clamp(v*k,0,1))}
 class Mesh{
  constructor(){this.data=[];this.count=0}
  tri(a,b,c,color){
   let ax=b[0]-a[0],ay=b[1]-a[1],az=b[2]-a[2],bx=c[0]-a[0],by=c[1]-a[1],bz=c[2]-a[2];
   let n=[ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx],len=Math.hypot(...n)||1;n=n.map(v=>v/len);
   const col=rgb(color);for(const p of [a,b,c])this.data.push(...p,...n,...col);this.count+=3;
  }
  quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color)}
  box(x,y,z,w,h,d,color,rotation=0){
   const W=w/2,H=h/2,D=d/2,co=Math.cos(rotation),si=Math.sin(rotation);
   const pos=(xx,yy,zz)=>[x+xx*co+zz*si,y+yy,z-xx*si+zz*co];
   const p=[pos(-W,-H,-D),pos(W,-H,-D),pos(W,H,-D),pos(-W,H,-D),pos(-W,-H,D),pos(W,-H,D),pos(W,H,D),pos(-W,H,D)];
   this.quad(p[4],p[5],p[6],p[7],shade(color,1.00));
   this.quad(p[1],p[0],p[3],p[2],shade(color,.81));
   this.quad(p[5],p[1],p[2],p[6],shade(color,.88));
   this.quad(p[0],p[4],p[7],p[3],shade(color,.77));
   this.quad(p[7],p[6],p[2],p[3],shade(color,1.13));
   this.quad(p[0],p[1],p[5],p[4],shade(color,.57));
  }
  cylinder(x,y,z,r,h,color,sides=8,topRadius=r){
   let botY=y-h/2,topY=y+h/2;
   for(let i=0;i<sides;i++){
    let a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;
    let p=[x+Math.cos(a)*r,botY,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,botY,z+Math.sin(b)*r];
    let s=[x+Math.cos(a)*topRadius,topY,z+Math.sin(a)*topRadius],t=[x+Math.cos(b)*topRadius,topY,z+Math.sin(b)*topRadius];
    this.quad(p,q,t,s,shade(color,1-(i%3)*.065));
    if(topRadius>0)this.tri([x,topY,z],s,t,shade(color,1.2));
   }
  }
  sphere(x,y,z,r,color,lat=5,lon=8){
   for(let i=0;i<lat;i++){
    let phi=i/lat*Math.PI,ph2=(i+1)/lat*Math.PI;
    for(let j=0;j<lon;j++){
     let th=j/lon*Math.PI*2,th2=(j+1)/lon*Math.PI*2;
     const p=(a,b)=>[x+r*Math.sin(a)*Math.cos(b),y+r*Math.cos(a),z+r*Math.sin(a)*Math.sin(b)];
     this.quad(p(phi,th),p(ph2,th),p(ph2,th2),p(phi,th2),shade(color,(i%3===0)?1.09:1));
    }
   }
  }
  ring(x,y,z,inside,outside,color,segments=22){
   for(let i=0;i<segments;i++){
    let a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
    this.quad([x+Math.cos(a)*inside,y,z+Math.sin(a)*inside],[x+Math.cos(b)*inside,y,z+Math.sin(b)*inside],[x+Math.cos(b)*outside,y,z+Math.sin(b)*outside],[x+Math.cos(a)*outside,y,z+Math.sin(a)*outside],color);
   }
  }
 }
 function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
 function lookAt(eye,target){
  const normalize=v=>{let m=Math.hypot(...v)||1;return v.map(n=>n/m)};
  let f=normalize(target.map((n,i)=>n-eye[i]));let s=normalize([-f[2],0,f[0]]); // cross(forward, up) = [-fz,0,fx]
  let u=[s[1]*f[2]-s[2]*f[1],s[2]*f[0]-s[0]*f[2],s[0]*f[1]-s[1]*f[0]];
  return new Float32Array([s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,-(s[0]*eye[0]+s[1]*eye[1]+s[2]*eye[2]),-(u[0]*eye[0]+u[1]*eye[1]+u[2]*eye[2]),f[0]*eye[0]+f[1]*eye[1]+f[2]*eye[2],1]);
 }
 function multiply(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let sum=0;for(let k=0;k<4;k++)sum+=a[k*4+r]*b[c*4+k];o[c*4+r]=sum}return o}
 class Renderer{
  constructor(canvas){
   this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
   const gl=this.gl;if(!gl)throw new Error('WebGL2 indisponible. Essaie Chrome, Firefox ou Edge avec accélération matérielle.');
   const vs=`#version 300 es
   in vec3 a_pos;in vec3 a_normal;in vec3 a_color;
   uniform mat4 u_viewProj;uniform vec3 u_sun;uniform float u_brightness;
   out vec3 v_color;out vec3 v_pos;
   void main(){vec3 norm=normalize(a_normal);float lambert=max(dot(norm,normalize(u_sun)),0.0);float lighting=(.42+lambert*.58)*u_brightness;v_color=a_color*lighting;v_pos=a_pos;gl_Position=u_viewProj*vec4(a_pos,1.);}`;
   const fs=`#version 300 es
   precision highp float;in vec3 v_color;in vec3 v_pos;
   uniform vec3 u_eye;uniform vec3 u_fog;out vec4 outColor;
   void main(){float d=distance(v_pos,u_eye);float fog=smoothstep(120.,390.,d);vec3 c=mix(v_color,u_fog,fog*.82);c=pow(c,vec3(.92));outColor=vec4(c,1.);}`;
   const makeShader=(type,src)=>{let sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh};
   const prog=gl.createProgram();gl.attachShader(prog,makeShader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,makeShader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));this.program=prog;
   this.aPos=gl.getAttribLocation(prog,'a_pos');this.aNormal=gl.getAttribLocation(prog,'a_normal');this.aColor=gl.getAttribLocation(prog,'a_color');
   this.uVP=gl.getUniformLocation(prog,'u_viewProj');this.uEye=gl.getUniformLocation(prog,'u_eye');this.uSun=gl.getUniformLocation(prog,'u_sun');this.uFog=gl.getUniformLocation(prog,'u_fog');this.uBrightness=gl.getUniformLocation(prog,'u_brightness');
   this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.staticCount=0;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  }
  uploadStatic(mesh){const gl=this.gl;this.staticCount=mesh.count;gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW)}
  bind(buffer){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let [attr,offset] of [[this.aPos,0],[this.aNormal,12],[this.aColor,24]]){gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,36,offset)}}
  draw(mesh,eye,target,time,brightness){
   const gl=this.gl,c=this.canvas,dpr=Math.min(window.devicePixelRatio||1,(window.VIVA_CONFIG&&window.VIVA_CONFIG.maxPixelRatio)||1.6),width=Math.max(1,Math.floor(c.clientWidth*dpr)),height=Math.max(1,Math.floor(c.clientHeight*dpr));
   if(c.width!==width||c.height!==height){c.width=width;c.height=height;gl.viewport(0,0,width,height)}
   const sun=[.75,Math.cos((time-.5)*Math.PI*2)*1.0+.3,.45],fog=[.52*brightness,.76*brightness,.85*brightness];gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(this.program);gl.uniformMatrix4fv(this.uVP,false,multiply(perspective(Math.PI/3,width/height,.1,650),lookAt(eye,target)));
   gl.uniform3fv(this.uEye,eye);gl.uniform3fv(this.uSun,sun);gl.uniform3fv(this.uFog,fog);gl.uniform1f(this.uBrightness,brightness);
   this.bind(this.staticBuffer);gl.drawArrays(gl.TRIANGLES,0,this.staticCount);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.DYNAMIC_DRAW);
   this.bind(this.dynamicBuffer);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
 }
 window.Viva3D={Mesh,Renderer,clamp,shade,rgb};
})();
