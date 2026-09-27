import { canvas, exportSettings, state } from "./state.js";
import { renderAnimationFrame } from "./animation.js";

export async function exportWebM(){
 const recCanvas=document.createElement("canvas");recCanvas.width=canvas.width;recCanvas.height=canvas.height;const rctx=recCanvas.getContext("2d");
 const stream=recCanvas.captureStream(exportSettings.fps);
 let mime="video/webm;codecs=vp9";if(!MediaRecorder.isTypeSupported(mime))mime="video/webm";
 const chunks=[];const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.round(2500000*exportSettings.quality/100)});
 rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
 const done=new Promise(res=>rec.onstop=()=>res(new Blob(chunks,{type:mime})));
 rec.start(100);
 const total=Math.max(...state.layers.map((layer)=>layer.settings.cycle))*1000,start=performance.now();
 function tick(now){const elapsed=now-start;if(elapsed>=total){rec.stop();return}renderAnimationFrame(elapsed,rctx);requestAnimationFrame(tick)}requestAnimationFrame(tick);
 return done;
}
// Minimal GIF89a encoder with global palette generated from sampled frames.
export function encodeGIF(frames,w,h,fps){
 const sample=frames.flatMap(a=>{let s=[];for(let i=0;i<a.length;i+=4*7)s.push([a[i],a[i+1],a[i+2]]);return s});
 const pal=[];for(let i=0;i<256;i++){const q=sample[Math.floor(i*sample.length/256)]||[0,0,0];pal.push(...q.map(v=>Math.max(0,Math.min(255,Math.round(v/16)*16))))}
 const bytes=[];const put=s=>[...s].forEach(c=>bytes.push(c.charCodeAt(0)));put("GIF89a");const le=n=>[n&255,n>>8&255];bytes.push(...le(w),...le(h),0xF7,0,0,...pal);
 const u16=n=>{bytes.push(n&255,n>>8)};const lzw=(pix,min=8)=>{const clearButton=1<<min,end=clearButton+1;let size=min+1,next=end+1,dict=new Map(),out=[],bits=0,cur=0;function code(c){cur|=c<<bits;bits+=size;while(bits>=8){out.push(cur&255);cur>>=8;bits-=8}}code(clearButton);let s="";for(const p of pix){const k=s+","+p;if(s&&dict.has(k)){s=k}else{if(s)code(dict.get(s));else code(p);if(s&&next<4096){dict.set(k,next++);if(next===(1<<size)&&size<12)size++}s=""+p}}if(s)code(dict.get(s)||+s);code(end);if(bits)out.push(cur&255);return out}
 frames.forEach((rgba,idx)=>{bytes.push(0x21,0xF9,4,0x04);u16(Math.max(1,Math.round(100/fps)));bytes.push(0,0,0x2C,...le(0),...le(0),...le(w),...le(h),0);const pix=[];for(let i=0;i<rgba.length;i+=4){let best=0,bd=1e9;for(let j=0;j<256;j++){const dr=rgba[i]-pal[j*3],dg=rgba[i+1]-pal[j*3+1],db=rgba[i+2]-pal[j*3+2],d=dr*dr+dg*dg+db*db;if(d<bd){bd=d;best=j}}pix.push(best)}const data=lzw(pix);bytes.push(8);for(let i=0;i<data.length;i+=255){const n=Math.min(255,data.length-i);bytes.push(n,...data.slice(i,i+n))}bytes.push(0)});bytes.push(0x3B);return new Uint8Array(bytes)
}
export async function exportGIF(){
 const w=canvas.width,h=canvas.height,c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d"),frames=[],count=Math.round(Math.max(...state.layers.map((layer)=>layer.settings.cycle))*exportSettings.fps);
 for(let i=0;i<count;i++){renderAnimationFrame(i/exportSettings.fps*1000,x);frames.push(x.getImageData(0,0,w,h).data.slice());if(i%4===0)await new Promise(requestAnimationFrame)}
 return new Blob([encodeGIF(frames,w,h,exportSettings.fps)],{type:"image/gif"});
}
export async function exportVideoMP4(){ // MediaRecorder may expose MP4 on some browsers.
 const c=document.createElement("canvas");c.width=canvas.width;c.height=canvas.height;const x=c.getContext("2d"),stream=c.captureStream(exportSettings.fps),types=["video/mp4;codecs=avc1","video/mp4","video/webm"];
 const mime=types.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t));if(!mime)throw new Error("MP4 is not supported in this browser. Use WebM.");
 const chunks=[],r=new MediaRecorder(stream,{mimeType:mime});r.ondataavailable=e=>e.data.size&&chunks.push(e.data);const p=new Promise(res=>r.onstop=()=>res(new Blob(chunks,{type:mime})));r.start(100);const start=performance.now(),total=Math.max(...state.layers.map((layer)=>layer.settings.cycle))*1000;function t(now){if(now-start>=total){r.stop();return}renderAnimationFrame(now-start,x);requestAnimationFrame(t)}requestAnimationFrame(t);return p;
}
