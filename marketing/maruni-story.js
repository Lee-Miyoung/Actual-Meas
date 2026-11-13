/* Maruni & Ruru photo story workspace. Isolated: does not read or modify existing application state. */
(() => {
  "use strict";
  const root = document.getElementById("maruni-story");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const photo = $("#mr-photo"), asset = $("#mr-character");
  const canvas = $("#mr-canvas"), ctx = canvas.getContext("2d");
  const state = {bg:null, character:null, x:.72, y:.73, scale:.27, flipped:false, bubble:"", actor:"maruni"};
  const fit = (im, w,h) => {let r=Math.max(w/im.width,h/im.height);return {w:im.width*r,h:im.height*r,x:(w-im.width*r)/2,y:(h-im.height*r)/2};};
  const imageFile = file => new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url); resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("이미지를 열 수 없습니다."));};
    img.src=url;
  });
  function paint() {
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#eeeae3";ctx.fillRect(0,0,w,h);
    if(state.bg){const p=fit(state.bg,w,h);ctx.drawImage(state.bg,p.x,p.y,p.w,p.h);}
    if(state.character){
      const im=state.character, cw=w*state.scale, ch=cw*im.height/im.width;
      const x=w*state.x-cw/2,y=h*state.y-ch/2;
      ctx.save();if(state.flipped){ctx.translate(x+cw,0);ctx.scale(-1,1);ctx.drawImage(im,0,y,cw,ch);}
      else ctx.drawImage(im,x,y,cw,ch);ctx.restore();
    }
    const line=state.bubble.trim();
    if(line){
      ctx.save();ctx.font="bold 42px sans-serif";ctx.textBaseline="middle";
      const lines=line.split("\n").slice(0,3);const pad=34, lineHeight=60;
      const bw=Math.min(w-80,Math.max(260,...lines.map(t=>ctx.measureText(t).width+pad*2)));
      const bx=Math.max(20,Math.min(w-bw-20,state.x*w-bw/2)),by=Math.max(12,state.y*h-230-lines.length*lineHeight);
      ctx.fillStyle="rgba(255,252,246,.94)";ctx.strokeStyle="#49352a";ctx.lineWidth=3;
      ctx.beginPath();ctx.roundRect(bx,by,bw,lines.length*lineHeight+pad,24);ctx.fill();ctx.stroke();
      ctx.fillStyle="#2d2622";lines.forEach((t,i)=>ctx.fillText(t,bx+pad,by+pad+i*lineHeight+lineHeight/2));
      ctx.restore();
    }
  }
  const err=$("#mr-status");
  async function onFile(e,key){const f=e.target.files?.[0];if(!f)return;
    try{state[key]=await imageFile(f); err.textContent=f.name+" 불러옴";paint();}
    catch(ex){err.textContent=ex.message;}
  }
  photo.addEventListener("change",e=>onFile(e,"bg"));
  asset.addEventListener("change",e=>onFile(e,"character"));
  $("#mr-bubble").addEventListener("input",e=>{state.bubble=e.target.value;paint();});
  $("#mr-size").addEventListener("input",e=>{state.scale=Number(e.target.value)/100;paint();});
  $("#mr-flip").addEventListener("click",()=>{state.flipped=!state.flipped;paint();});
  let moving=false;
  const update=(e)=>{const r=canvas.getBoundingClientRect();state.x=Math.min(.95,Math.max(.05,(e.clientX-r.left)/r.width));state.y=Math.min(.93,Math.max(.08,(e.clientY-r.top)/r.height));paint();};
  canvas.addEventListener("pointerdown",e=>{moving=true;canvas.setPointerCapture(e.pointerId);update(e);});
  canvas.addEventListener("pointermove",e=>{if(moving)update(e);});
  canvas.addEventListener("pointerup",()=>{moving=false;});
  $("#mr-export").addEventListener("click",()=>{
    const a=document.createElement("a");a.download="maruni-ruru-story.png";a.href=canvas.toDataURL("image/png");a.click();
  });
  const spots=$("#mr-presets");
  ["깔끔하다개!","예쁘개!","좋다개!"].forEach(t=>{const b=document.createElement("button");b.type="button";b.textContent=t;
    b.onclick=()=>{$("#mr-bubble").value=t;state.bubble=t;paint();};spots.append(b);});
  paint();
})();
