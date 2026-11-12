/* Shared by the cover and content canvases, at preview and export resolution. */
(function () {
  'use strict';
  const colors = {
    white: ['화이트', '#FFFFFF'], ivory: ['아이보리', '#F4F0E8'],
    sage: ['세이지', '#7C8980'], bronze: ['브론즈', '#9D8063'],
    charcoal: ['차콜', '#242321'], black: ['블랙', '#141414']
  };
  const logos = new Map();
  const font = size => '550 ' + size + 'px "Hahmlet Title", "Studio Serif", serif';
  function loadTitle(text) {
    return document.fonts.load('550 46px "Hahmlet Title"', text).catch(() => document.fonts.load('400 46px "Studio Serif"', text));
  }
  function pairLabel(choice, role) {
    if (choice?.pairConcept !== 'preview') return role === 'before' ? '시공 전' : '시공 후';
    const key = role === 'before' ? 'firstScene' : 'secondScene';
    return choice[key] || (role === 'before' ? '장면 01' : '장면 02');
  }
  function drawLabel(g, canvas, choice, role, x, y, limit = 420) {
    const text = pairLabel(choice, role), size = 22, height = 42;
    g.save();
    g.font = '500 ' + size + 'px "Studio Sans", sans-serif';
    const width = Math.min(limit, Math.ceil(g.measureText(text).width) + 28);
    g.fillStyle = 'rgba(29,39,32,.76)';
    g.beginPath(); g.roundRect(x,y,width,height,9); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text,x+width/2,y+height/2,width-20);
    g.restore();
    if (choice?.pairConcept === 'preview') canvas.typeLayout.push({field:role==='before'?'firstScene':'secondScene',source:text,x,y,width,height,size});
  }
  let sample;
  function brightBehind(g,x,y,width,height) {
    if (!(width>0 && height>0)) return false;
    if (!sample) {
      const probe=document.createElement('canvas');
      probe.width=8; probe.height=3;
      sample=probe.getContext('2d',{willReadFrequently:true});
    }
    const t=g.getTransform();
    sample.clearRect(0,0,8,3);
    sample.drawImage(g.canvas,x*t.a+t.e,y*t.d+t.f,width*t.a,height*t.d,0,0,8,3);
    const pixels=sample.getImageData(0,0,8,3).data;
    let bright=0;
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]>160 && .2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]>=208)bright++;
    }
    return bright>=10;
  }
  function softShadow(g) {
    const scale=g.getTransform().a;
    g.shadowColor='rgba(24,22,18,0.20)';
    g.shadowBlur=1.8*scale;g.shadowOffsetX=0;g.shadowOffsetY=.8*scale;
  }
  function lightInk(color) {
    if(typeof color!=='string')return false;
    const rgb=color.startsWith('#') ? (color.length===4?color.slice(1).split('').map(v=>parseInt(v+v,16)):
      [1,3,5].map(i=>parseInt(color.slice(i,i+2),16))) : color.match(/[\d.]+/g)?.slice(0,3).map(Number);
    return rgb && Math.min(...rgb)>=175;
  }
  function drawText(g,line,x,y) {
    if(!lightInk(g.fillStyle)){g.fillText(line,x,y);return;}
    const m=g.measureText(line),top=y-m.actualBoundingBoxAscent;
    const height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    g.save();
    if(brightBehind(g,x,top,m.width,height))softShadow(g);
    g.fillText(line,x,y);g.restore();
  }
  async function logo(tone) {
    const key=Object.hasOwn(colors,tone)?tone:'white';
    if(!logos.has(key))logos.set(key,loadImage('brand/logo-'+key+'.svg').catch(e=>{logos.delete(key);throw e;}));
    return {image:await logos.get(key),key};
  }
  function drawLogo(g,canvas,mark,units,x,y) {
    const width=units*.15,height=width*mark.image.height/mark.image.width;
    const box={units,x,y,width,height};
    g.save();g.globalAlpha=1;
    if(lightInk(colors[mark.key][1]) && brightBehind(g,x,y,width,height))softShadow(g);
    g.drawImage(mark.image,x,y,width,height);g.restore();canvas.logoBox=box;return box;
  }
  window.CheonginCoverStyle={colors,font,loadTitle,pairLabel,drawLabel,logo,drawLogo,drawText};
})();
