// One reusable player: reviewed dialogue is readable even before cloud synthesis is ready.
const audio=document.querySelector('audio');
if(audio){
  const root=new URL('.',location.href),dialogue=await fetch(new URL('dialogue.json',root)).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).catch(()=>null);
  if(dialogue){
    audio.src=new URL('media/dialogue-v2.mp3',root).href;
    const panel=document.createElement('section');panel.className='dialogue-panel';
    panel.innerHTML='<div class="dialogue-now"><b>学长和学妹聊桥</b><p>边看桥，边聊聊它为什么会这样。</p></div><details><summary>展开对话全文</summary><div class="dialogue-lines"></div></details>';
    audio.after(panel);const style=document.createElement('style');style.textContent='.dialogue-panel{font-size:12px;line-height:1.8;margin:10px 0;max-width:850px}.dialogue-now{border-left:3px solid #157b79;background:#eaf1ef;padding:10px 13px}.dialogue-now b{color:#157b79}.dialogue-now p{margin:3px 0}.dialogue-lines article{padding:10px 0;border-bottom:1px solid #ccd9dc}.dialogue-lines article[data-role=curious] b{color:#996529}.dialogue-lines button{font-size:10px;margin-left:7px}.dialogue-panel summary{cursor:pointer}';document.head.append(style);
    const names={curious:'学妹',expert:'学长'},lines=panel.querySelector('.dialogue-lines');
    dialogue.forEach((d,i)=>{const a=document.createElement('article');a.dataset.role=d.role;const b=document.createElement('b');b.textContent=names[d.role]||d.role;const t=document.createElement('p');t.textContent=d.text;a.append(b,t);lines.append(a);});
    const candidate=await fetch(new URL('media/dialogue-v2-timing.json',root)).then(r=>r.ok?r.json():null).catch(()=>null);
    const timing=candidate?.segments?.length===dialogue.length&&candidate.segments.every((s,i)=>s.text===dialogue[i].text&&s.role===dialogue[i].role)?candidate:null;
    if(!timing){audio.hidden=true;panel.querySelector('.dialogue-now p').textContent='对话已改写，正在制作新版声音。下方可先读全文。';document.querySelectorAll('#play-narration').forEach(b=>{b.disabled=true;b.textContent='新版声音制作中';});}
    else{
      audio.hidden=false;audio.dataset.dialogueReady='true';audio.dialogueTiming=timing;audio.dispatchEvent(new CustomEvent('dialogueready',{detail:timing}));let last=-1;
      const update=(force=false)=>{const i=timing.segments.findIndex(s=>audio.currentTime>=s.start&&audio.currentTime<s.end);if(i>=0&&(force||i!==last)){last=i;const d=dialogue[i];panel.querySelector('.dialogue-now b').textContent=names[d.role];panel.querySelector('.dialogue-now p').textContent=d.text;audio.dispatchEvent(new CustomEvent('dialoguecue',{detail:{...d,index:i}}));}};
      audio.addEventListener('timeupdate',()=>update());audio.addEventListener('seeked',()=>update(true));
      lines.querySelectorAll('article').forEach((a,i)=>{const b=document.createElement('button');b.textContent='从这里听';b.onclick=()=>{audio.currentTime=timing.segments[i].start;update(true);audio.play().catch(()=>{panel.querySelector('.dialogue-now p').textContent='请用音频控件继续播放。'+dialogue[i].text;});};a.querySelector('b').after(b);});
      const note=document.createElement('p');note.textContent='火山豆包语音 · 双声线 · '+Math.round(timing.duration)+' 秒';note.style.fontSize='10px';panel.append(note);
    }
  }
}
