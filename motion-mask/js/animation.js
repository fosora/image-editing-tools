import { canvas, ctx, mask, mctx, state, animationSettings, animationPresets, warpCache } from "./state.js";

const warpSource=document.createElement("canvas");
const warpContext=warpSource.getContext("2d",{willReadFrequently:true});
const warpMask=document.createElement("canvas");
const warpMaskContext=warpMask.getContext("2d",{willReadFrequently:true});
Object.assign(warpCache,{w:0,h:0,image:null,mask:null});

function ensureWarpCache(){
 if(!state.image||warpCache.w===canvas.width&&warpCache.h===canvas.height&&warpCache.cohesion===animationSettings.cohesion)return;
 const w=canvas.width,h=canvas.height;
 warpSource.width=w; warpSource.height=h;
 warpMask.width=w; warpMask.height=h;
 warpContext.clearRect(0,0,w,h);
 warpContext.drawImage(state.image,0,0,w,h);
 warpMaskContext.clearRect(0,0,w,h);
 const blur=Math.max(4,Math.round(6+(100-animationSettings.cohesion)*0.20));
 warpMaskContext.save();
 warpMaskContext.filter=`blur(${blur}px)`;
 warpMaskContext.drawImage(mask,0,0,w,h);
 warpMaskContext.restore();
 const rawMask=mctx.getImageData(0,0,w,h).data;
 let sumA=0,sumX=0,sumY=0,minY=h,maxY=0;
 for(let i=0;i<rawMask.length;i+=4){
   const a=rawMask[i+3];
   if(a){const p=i/4, py=Math.floor(p/w);sumA+=a;sumX+=(p%w)*a;sumY+=py*a;if(py<minY)minY=py;if(py>maxY)maxY=py;}
 }
 const cx=sumA?sumX/sumA:w/2,cy=sumA?sumY/sumA:h/2;
 Object.assign(warpCache,{w,h,cohesion:animationSettings.cohesion,image:warpContext.getImageData(0,0,w,h),mask:warpMaskContext.getImageData(0,0,w,h),cx,cy,minY:maxY>=minY?minY:0,maxY});
}

function smoothStep(v){
 v=Math.max(0,Math.min(1,v));
 return v*v*(3-2*v);
}

function getMotionVector(t,w,h){
 const preset=animationPresets[animationSettings.preset];
 const cycle=Math.max(.1,animationSettings.cycle);
 const phase=t/cycle*Math.PI*2;
 const s=Math.sin(phase), c=Math.cos(phase);
 let vx=0,vy=0;
 if(animationSettings.direction!=="preset"){
   const dir = animationSettings.direction;
   if(dir==="left") vx=-Math.abs(s);
   else if(dir==="right") vx=Math.abs(s);
   else if(dir==="up") vy=-Math.abs(s);
   else if(dir==="down") vy=Math.abs(s);
   else if(dir==="horizontal") vx=s;
   else if(dir==="vertical") vy=s;
   else if(dir==="circular") {
     vx=Math.cos(phase);
     vy=Math.sin(phase);
   }
 }else{
   switch(preset.mode){
     case "sway": vx=s; break;
     case "bounce": vy=Math.abs(s)*2-1; break;
     case "wave": vx=s; vy=Math.sin(phase*2)*.28; break;
     case "pulse": vx=s*.72; vy=c*.72; break;
     case "quake": vx=Math.sin(phase*5)*.75; vy=Math.cos(phase*7)*.75; break;
     default: vx=s; vy=c*.48;
   }
 }
 const elastic=0.45+(animationSettings.elasticity/100)*1.35;
 const stable=0.35+(animationSettings.stability/100)*0.65;
 // 50% global reduction: new 100 equals the previous 50.
 const amplitude=Math.min(w,h)*0.16*(animationSettings.force/100)*0.5*preset.wave*elastic*stable;
 vx*=amplitude; vy*=amplitude;
 const pulseScale=preset.mode==="pulse"
   ? s*(amplitude/Math.max(1,Math.min(w,h)))*1.6
   : 0;
 const angle=animationSettings.gravityAngle*Math.PI/180;
 const gravity=(animationSettings.gravity/100)*amplitude*.75;
 vx+=Math.cos(angle)*gravity*(.5+.5*(1-c));
 vy+=Math.sin(angle)*gravity*(.5+.5*(1-c));
 return {x:vx,y:vy,phase,amplitude,pulseScale};
}

export function renderAnimationFrame(time, target=ctx){
 if(!state.image)return;
 const t=(time%(animationSettings.cycle*1000))/1000;
 ensureWarpCache();
 const w=canvas.width,h=canvas.height;
 const src=warpCache.image.data, md=warpCache.mask.data;
 const out=target.createImageData(w,h), dst=out.data;
 const motion=getMotionVector(t,w,h);
 const cohesion=animationSettings.cohesion/100;
 const stability=animationSettings.stability/100;
 const elasticity=animationSettings.elasticity/100;
 for(let y=0;y<h;y++){
   for(let x=0;x<w;x++){
     const i=(y*w+x)*4;
     let strength=smoothStep(md[i+3]/255);
     // Feather the deformation into the untouched image so the boundary never moves abruptly.
     const edgeFeather=smoothStep(Math.min(1,md[i+3]/255*1.35));
     strength*=edgeFeather;
     strength*=0.55+cohesion*.45;
     // The bounce effect gets a short, soft fade at its top edge.
     // This keeps the upper boundary visually attached to the image while
     // still allowing the lower part of the painted area to jump freely.
     if(animationPresets[animationSettings.preset].mode==="bounce" && warpCache.maxY>warpCache.minY){
       const fadePx=Math.max(8,Math.min(22,(warpCache.maxY-warpCache.minY)*0.10));
       const topFade=smoothStep((y-warpCache.minY)/fadePx);
       strength*=topFade;
     }
     const elasticWave=1+elasticity*.18*Math.sin(motion.phase*2+strength*2.2);
     let sx,sy;

     // Pulsation uses radial scaling around the painted area's center.
     // Positive scale inflates; negative scale contracts.
     if(animationPresets[animationSettings.preset].mode==="pulse" && animationSettings.direction==="preset"){
       const pulse=1+motion.pulseScale*strength*elasticWave;
       sx=warpCache.cx+(x-warpCache.cx)/pulse;
       sy=warpCache.cy+(y-warpCache.cy)/pulse;
     }else{
       let dx=motion.x*strength*elasticWave;
       let dy=motion.y*strength*elasticWave;
       dx*=0.72+stability*.28;
       dy*=0.72+stability*.28;
       sx=x-dx;
       sy=y-dy;
     }
     sx=Math.max(0,Math.min(w-1,sx));
     sy=Math.max(0,Math.min(h-1,sy));
     const x0=sx|0,y0=sy|0,x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1);
     const fx=sx-x0,fy=sy-y0;
     const a=(1-fx)*(1-fy),b=fx*(1-fy),c=(1-fx)*fy,d=fx*fy;
     const p00=(y0*w+x0)*4,p10=(y0*w+x1)*4,p01=(y1*w+x0)*4,p11=(y1*w+x1)*4;
     dst[i]=src[p00]*a+src[p10]*b+src[p01]*c+src[p11]*d;
     dst[i+1]=src[p00+1]*a+src[p10+1]*b+src[p01+1]*c+src[p11+1]*d;
     dst[i+2]=src[p00+2]*a+src[p10+2]*b+src[p01+2]*c+src[p11+2]*d;
     dst[i+3]=src[p00+3]*a+src[p10+3]*b+src[p01+3]*c+src[p11+3]*d;
   }
 }
 target.putImageData(out,0,0);
}

function animationLoop(ts){
 if(state.isPlaying && state.currentStep===2 && state.image) renderAnimationFrame(ts);
 requestAnimationFrame(animationLoop);
}
export function startAnimationLoop() { requestAnimationFrame(animationLoop); }
