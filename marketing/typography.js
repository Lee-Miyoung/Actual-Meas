/* Measured Korean typesetting. Original copy is never changed in project storage. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CheonginType=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const closing=/^[,.;:!?%℃°\)\]\}、。，．！？：；〉》」』】]/u,opening=/[\(\[\{〈《「『【]$/u;
  const segmenter=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter('ko',{granularity:'grapheme'}):null;
  function graphemes(text){return segmenter?[...segmenter.segment(text)].map(x=>x.segment):Array.from(text);}
  function piecesFor(text,width,measure){
    const pieces=[];
    for(const match of text.matchAll(/\S+\s*/gu)){
      const token=match[0],word=token.trimEnd(),space=/\s$/u.test(token)?' ':'';
      if(measure(word)<=width)pieces.push({text:word+space,emergency:false});
      else{const chars=graphemes(word);chars.forEach((ch,i)=>pieces.push({text:ch+(i===chars.length-1?space:''),emergency:true}));}
    }
    return pieces;
  }
  function paragraph(text,width,maxLines,measure,preferClauses=false){
    text=text.trim();if(!text)return {lines:[''],widths:[0]};
    if(measure(text)<=width)return {lines:[text],widths:[measure(text)]};
    const pieces=piecesFor(text,width,measure),n=pieces.length,cache=new Map();
    const lineAt=(a,b)=>{const key=a+':'+b;if(!cache.has(key)){const value=pieces.slice(a,b).map(p=>p.text).join('').trim();cache.set(key,{value,width:measure(value)});}return cache.get(key);};
    for(let count=Math.max(2,Math.ceil(measure(text)/width));count<=Math.min(maxLines,n);count++){
      const memo=new Map(),target=Math.min(width,measure(text)/count);
      function solve(start,left){
        if(start===n)return left===0?{cost:0,lines:[],widths:[]}:null;
        if(!left||n-start<left)return null;
        const key=start+':'+left;if(memo.has(key))return memo.get(key);
        let best=null;
        for(let end=start+1;end<=n;end++){
          const line=lineAt(start,end);if(line.width>width+.01)break;
          if(!line.value||closing.test(line.value)||opening.test(line.value))continue;
          const tail=solve(end,left-1);if(!tail)continue;
          const orphan=(end===n&&graphemes(line.value.replace(/\s/g,'')).length<3)?80:0;
          const tiny=(end===n&&line.width<width*.32)?30:0;
          const split=pieces[end-1].emergency&&end<n&&!/\s$/u.test(pieces[end-1].text)?8:0;
          const pause=/[,，:：]$/u.test(line.value)?-3:0;
          // In descriptive Korean copy, favor complete thoughts over equal line lengths.
          let phraseCost=0;
          if(preferClauses&&end<n){
            const next=pieces[end].text.trim();
            if(/[.!?。！？][”’」)]?$/u.test(line.value))phraseCost=-100;
            else if(/[,，]$/u.test(line.value))phraseCost=-36;
            else if(/(?:할지|될지|인지|는지|을지|을\s수|할\s수|될\s수|있을\s수)$/u.test(line.value)
              || /^(?:정합니다|봅니다|있습니다|없습니다|싶어요|볼게요|주세요|드려요)[.!?]?$/u.test(next))phraseCost=150;
          }
          const cost=phraseCost+tail.cost+Math.pow((line.width-target)/width,2)*100+orphan+tiny+split+pause;
          if(!best||cost<best.cost)best={cost,lines:[line.value,...tail.lines],widths:[line.width,...tail.widths]};
        }
        memo.set(key,best);return best;
      }
      const best=solve(0,count);if(best)return best;
    }
    return null;
  }
  function greedy(text,width,measure){
    const lines=[];let line='';
    for(const piece of piecesFor(text,width,measure)){
      if(line&&measure((line+piece.text).trimEnd())>width){lines.push(line.trim());line='';}
      line+=piece.text;
    }
    if(line.trim())lines.push(line.trim());return lines;
  }
  function layout(raw,options){
    const width=options.width,maxLines=Math.max(1,options.maxLines||2),maxSize=options.fontSize,minSize=Math.min(maxSize,options.minFontSize||maxSize),leading=options.leading||1.28;
    const source=String(raw||'').normalize('NFC'),chars=graphemes(source),bounded=chars.slice(0,512).join(''),paragraphs=bounded.split(/\r?\n/);
    // Prefer a meaningful comma pause when the complete clauses fit at a readable size.
    if(options.preferPause&&paragraphs.length===1&&maxLines>=2&&options.measure(bounded,maxSize)>width){
      const pause=bounded.indexOf(', ');
      if(pause>=3&&pause<bounded.length-4){
        const first=bounded.slice(0,pause+1),rest=bounded.slice(pause+2);
        for(let size=maxSize;size>=minSize;size=Math.max(minSize,size-2)){
          const measure=s=>options.measure(s,size),tail=paragraph(rest,width,maxLines-1,measure);
          if(measure(first)<=width&&tail&&tail.lines.length+1<=maxLines)return {lines:[first,...tail.lines],size,lineHeight:size*leading,widths:[measure(first),...tail.lines.map(measure)],truncated:chars.length>512,source};
          if(size===minSize)break;
        }
      }
    }
    let size=maxSize,last=[];
    for(;size>=minSize;size=Math.max(minSize,size-2)){
      const measure=s=>options.measure(s,size);let lines=[],fits=true;
      for(const p of paragraphs){const result=paragraph(p,width,maxLines-lines.length,measure,options.preferClauses);if(!result){fits=false;break;}lines.push(...result.lines);}
      if(fits&&lines.length<=maxLines&&chars.length<=512)return {lines,size,lineHeight:size*leading,widths:lines.map(measure),truncated:false,source};
      last=paragraphs.flatMap(p=>greedy(p,width,measure));if(size===minSize)break;
    }
    size=minSize;const measure=s=>options.measure(s,size),truncated=last.length>maxLines||chars.length>512;
    const lines=last.slice(0,maxLines);
    if(truncated&&lines.length){let value=graphemes(lines.at(-1));while(value.length&&measure(value.join('')+'…')>width)value.pop();lines[lines.length-1]=value.join('').trimEnd()+'…';}
    return {lines,size,lineHeight:size*leading,widths:lines.map(measure),truncated,source};
  }
  return {layout,graphemes};
});
