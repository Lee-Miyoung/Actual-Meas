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
  function luminance(r,g,b) {
    const linear = n => {const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
    return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);
  }
  function needsBacking(g, canvas, bounds, ink) {
    const scale=canvas.width/bounds.units;
    const sample=document.createElement('canvas');sample.width=12;sample.height=5;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(canvas,bounds.x*scale,bounds.y*scale,bounds.width*scale,bounds.height*scale,0,0,12,5);
    const pixels=ctx.getImageData(0,0,12,5).data;
    let weak=0;
    for(let i=0;i<pixels.length;i+=4){
      const bg=luminance(pixels[i],pixels[i+1],pixels[i+2]);
      if((Math.max(ink,bg)+.05)/(Math.min(ink,bg)+.05)<3)weak++;
    }
    sample.width=sample.height=1;
    return weak>=12;
  }
  async function logo(tone) {
    const key=Object.hasOwn(colors,tone)?tone:'white';
    if(!logos.has(key))logos.set(key,loadImage('brand/logo-'+key+'.svg').catch(e=>{logos.delete(key);throw e;}));
    return {image:await logos.get(key),key};
  }
  function drawLogo(g,canvas,mark,units,x,y) {
    const width=units*.15,height=width*mark.image.height/mark.image.width;
    const box={units,x,y,width,height};const hex=colors[mark.key][1];
    const ink=luminance(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
    g.save();g.globalAlpha=1;g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;
    if(needsBacking(g,canvas,box,ink)){
      const pad=units*.008;g.fillStyle=ink>.179?'rgba(24,29,25,.85)':'rgba(250,248,241,.92)';
      g.beginPath();g.roundRect(x-pad,y-pad,width+2*pad,height+2*pad,pad);g.fill();
    }
    g.drawImage(mark.image,x,y,width,height);g.restore();canvas.logoBox=box;return box;
  }
  window.CheonginCoverStyle={colors,font,loadTitle,pairLabel,drawLabel,logo,drawLogo};
})();
