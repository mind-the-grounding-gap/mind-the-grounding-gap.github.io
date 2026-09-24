'use strict';
const D=window.DEMO_DATA,$=s=>document.querySelector(s);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const ICONS={
 play:'<svg viewBox="0 0 16 16"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/></svg>',
 pause:'<svg viewBox="0 0 16 16"><rect x="3.5" y="2.8" width="3.2" height="10.4" rx=".6" fill="currentColor"/><rect x="9.3" y="2.8" width="3.2" height="10.4" rx=".6" fill="currentColor"/></svg>',
 check:'<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 cross:'<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 dash:'<svg viewBox="0 0 16 16"><path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 search:'<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
 close:'<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};
const icon=name=>{const s=el('span','icon');s.innerHTML=ICONS[name];s.setAttribute('aria-hidden','true');return s};
const TAG_SHORT={};
const TAG_COMP={};
const GROUPS=[['Open-weight systems',['moshirag','baseline','sft','grpo']],['Commercial systems',['gpt_realtime','gpt_live','gemini','qwen']]];
const css=getComputedStyle(document.documentElement),ACCENT=css.getPropertyValue('--accent').trim()||'#2457c5',WAVE=css.getPropertyValue('--wave').trim()||'#d3d8e0';
const state={panel:'sh',qid:'',search:'',speed:1,excerpts:true,selected:null};
let audios=[],rowAudios=[],cleanups=[],playAll=null,current=null;
const time=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const track=(name,params)=>{if(typeof gtag==='function')gtag('event',name,params)};
function stopAll(except){for(const a of audios)if(a!==except)a.pause()}
function navigate(panel,id){const q=D.questions.find(q=>q.panel===panel)||D.questions[0];location.hash=q.panel+'/'+(id||q.id)}
function bins(wave,n){if(n>=wave.length)return wave;const out=[],step=wave.length/n;for(let i=0;i<n;i++){const a=Math.floor(i*step),b=Math.max(a+1,Math.floor((i+1)*step));let m=0;for(let j=a;j<b;j++)m=Math.max(m,wave[j]);out.push(m)}return out}
function ref(q){return q.reference_display||q.reference}

function audioPlayer(item,label,h){
 h=h||36;
 const wrap=el('div','player'),play=el('button','play'),visual=el('div','wavebox'),canvas=el('canvas','wave'),seek=el('input','seek'),clock=el('span','clock'),a=new Audio(item.audio);
 play.type='button';play.append(icon('play'));play.setAttribute('aria-label','Play '+label);a.preload='none';a.playbackRate=state.speed;audios.push(a);
 seek.type='range';seek.min=0;seek.max=item.duration;seek.step=.05;seek.value=0;seek.setAttribute('aria-label','Seek '+label);canvas.setAttribute('aria-hidden','true');canvas.style.height=h+'px';
 function draw(){const w=canvas.getBoundingClientRect().width,dpr=devicePixelRatio||1;if(!w)return;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,w,h);const wave=bins(item.waveform,Math.max(8,Math.floor(w/3))),peak=Math.max(.05,...wave),progress=item.duration?a.currentTime/item.duration:0,step=w/wave.length;
  wave.forEach((v,i)=>{const bar=Math.max(2,Math.sqrt(v/peak)*(h-6));c.fillStyle=i/wave.length<=progress?ACCENT:WAVE;c.fillRect(i*step,(h-bar)/2,Math.max(1,step-1),bar)});if(progress>0){c.fillStyle=ACCENT;c.fillRect(Math.min(w-1,progress*w),0,1,h)}}
 const update=()=>{seek.value=a.currentTime;clock.textContent=time(a.currentTime)+' / '+time(item.duration);draw()};
 const setPlaying=on=>{play.replaceChildren(icon(on?'pause':'play'));play.classList.toggle('playing',on);play.setAttribute('aria-label',(on?'Pause ':'Play ')+label);wrap.closest('.card')?.classList.toggle('playing',on)};
 play.onclick=e=>{e.stopPropagation();if(a.paused){playAll=null;$('#playall').classList.remove('active');stopAll(a);track('audio_play',{clip:label,question_id:state.qid});a.play().catch(()=>{clock.textContent='Unavailable';clock.classList.add('error')})}else a.pause()};
 a.onplay=()=>setPlaying(true);a.onpause=()=>setPlaying(false);
 a.onended=()=>{setPlaying(false);update();if(playAll&&playAll.list[playAll.i]===a){playAll.i++;const nxt=playAll.list[playAll.i];if(nxt)nxt.play().catch(()=>{});else{playAll=null;$('#playall').classList.remove('active')}}};
 a.ontimeupdate=update;a.onerror=()=>{clock.textContent='Unavailable';clock.classList.add('error')};
 seek.oninput=()=>{a.currentTime=Number(seek.value);update()};seek.onclick=e=>e.stopPropagation();
 visual.append(canvas,seek);wrap.append(play,visual,clock);const observer=new ResizeObserver(draw);observer.observe(canvas);cleanups.push(()=>observer.disconnect());clock.textContent='0:00 / '+time(item.duration);wrap.audio=a;return wrap;
}
function silentStrip(){const s=el('div','player silent'),b=el('span','play muted');b.append(icon('dash'));s.append(b,el('span','silent-note','No audible speech in this recording'));return s}
function mark(ok,key,title){const m=el('div','mark '+(ok===null?'na':ok?'ok':'bad')),v=el('span','v');v.append(icon(ok===null?'dash':ok?'check':'cross'),el('span',null,ok===null?'n/a':ok?'Yes':'No'));m.append(el('span','k',key),v);m.title=title;m.setAttribute('aria-label',key+': '+(ok===null?'not applicable':ok?'yes':'no'));return m}
function marks(m){const c=m.checks||{},row=el('div','marks');
 row.append(mark(!!c.called,'Searched',c.called?'The model called the search tool':'The model answered without searching'));
 row.append(c.called?mark(!!c.grounded,'Retrieved',c.grounded?'A retrieved passage contains the expected answer':'No retrieved passage contains the expected answer'):mark(null,'Retrieved','No search, so nothing was retrieved'));
 row.append(mark(!!c.correct,'Correct',c.correct?'The answer matches the expected answer':'The answer does not match the expected answer'));return row}
const FILLER=/^(let me|let's|let us|i'll|i will|i'm going to|i am going to|i'm checking|i'm looking|okay|ok\b|hmm|oh\b|sure|one second|just a second|checking|searching|that's (a|an|really|such|quite)|interesting topic|ciao|hi\b|hello|good (morning|question)|give me|great question)/i;
function excerptOf(text,refText){const parts=text.split(/(?<=[.!?])\s+/),r=(refText||'').toLowerCase();let i=0;
 while(i<parts.length-1){const t=parts[i].trim();if(!(FILLER.test(t)&&t.length<=90&&!/\d/.test(t)&&!(r&&t.toLowerCase().includes(r))))break;i++}
 return {text:(i?'… ':'')+parts.slice(i).join(' '),trimmed:i>0}}
function highlight(text,needle,cls){const p=el('p',cls);if(!needle||needle.length<2){p.textContent=text;return p}const re=new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig');let last=0,x;while((x=re.exec(text))){p.append(document.createTextNode(text.slice(last,x.index)));p.append(el('mark',null,x[0]));last=x.index+x[0].length}p.append(document.createTextNode(text.slice(last)));return p}

function renderList(){const qs=D.questions.filter(q=>q.panel===state.panel),needle=state.search.toLowerCase(),list=qs.filter(q=>((q.question_display||q.question)+' '+q.reference+' '+(TAG_SHORT[q.tag]||'')).toLowerCase().includes(needle));
 $('#count').textContent=list.length+' / '+qs.length;const nav=$('#questionList');nav.replaceChildren();
 for(const q of list){const b=el('button',q.id===state.qid?'active':'');b.type='button';b.append(el('span','qid',String(qs.indexOf(q)+1).padStart(2,'0')+' · '+q.dataset),document.createTextNode(q.question_display||q.question));if(q.tag)b.append(el('span','tag',TAG_SHORT[q.tag]||q.tag));b.onclick=()=>navigate(q.panel,q.id);if(q.id===state.qid)b.setAttribute('aria-current','true');nav.append(b)}
 if(!list.length)nav.append(el('p','empty-list','No matching questions.'));
 const sel=$('#qselect');sel.replaceChildren();for(const q of qs){const o=el('option',null,String(qs.indexOf(q)+1).padStart(2,'0')+' · '+(q.question_display||q.question));o.value=q.id;if(q.id===state.qid)o.selected=true;sel.append(o)}}

function renderDetail(q){const panel=$('#detail');panel.replaceChildren();const m=q.models.find(x=>x.id===state.selected);
 document.querySelectorAll('.card').forEach(c=>c.classList.toggle('selected',c.dataset.model===state.selected));
 if(!m){panel.className='detail empty';panel.append(el('p',null,'Select a model to read its full transcript and its searches.'));return}
 panel.className='detail';const head=el('div','detail-head'),h=el('h3',null,m.label);h.append(el('span','sub',m.subtitle));const close=el('button','close');close.type='button';close.setAttribute('aria-label','Close details');close.append(icon('close'));close.onclick=()=>{state.selected=null;renderDetail(q)};head.append(h,close);
 const grid=el('div','detail-grid'),left=el('section'),right=el('section');
 left.append(el('h4',null,'Transcript'));
 left.append(highlight(m.text||(m.silent?'No spoken answer was produced.':'No transcript was saved for this recording.'),ref(q),'transcript'));
 const ok=!!(m.checks&&m.checks.correct),v=el('div','verdict '+(ok?'ok':'bad'));v.append(icon(ok?'check':'cross'));const vt=el('span');vt.append(el('b',null,ok?'Correct':'Incorrect'));v.append(vt);left.append(v);
 right.append(el('h4',null,'Searches ('+m.calls.length+')'));if(!m.calls.length)right.append(el('p','caption','No search was issued for this response.'));
 m.calls.forEach((call,i)=>{const c=el('div','call'),qrow=el('div','call-q');qrow.append(icon('search'),el('span','n','#'+(i+1)),el('span',null,call.query||'(empty query)'));c.append(qrow);
  for(const doc of call.docs.slice(0,1)){const d=el('details'),s=el('summary',null,doc.title||'Retrieved passage');d.append(s,highlight(doc.snippet||'No passage text saved.',ref(q),'snippet'));if(doc.id)d.append(el('div','docid',doc.id));c.append(d)}
  right.append(c)});
 grid.append(left,right);panel.append(head,grid)}

function render(){const [panel,id]=location.hash.slice(1).split('/');if(['sh','mh'].includes(panel)&&panel!==state.panel){state.panel=panel;state.search='';$('#search').value=''}
 if(!D.questions.some(q=>q.panel===state.panel))state.panel=D.questions[0].panel;const qs=D.questions.filter(q=>q.panel===state.panel),q=qs.find(q=>q.id===id)||qs[0];if(q.id!==state.qid)state.selected=null;state.qid=q.id;current=q;
 stopAll();playAll=null;$('#playall').classList.remove('active');audios.forEach(a=>{a.removeAttribute('src');a.load()});audios=[];rowAudios=[];cleanups.forEach(f=>f());cleanups=[];
 for(const p of ['sh','mh']){$('#'+p+'-tab').classList.toggle('active',state.panel===p);$('#'+p+'-tab').setAttribute('aria-pressed',String(state.panel===p))}renderList();
 const idx=qs.indexOf(q);$('#position').textContent=(state.panel==='sh'?'Single-hop':'Multi-hop')+(qs.length>1?' · Example '+(idx+1)+' of '+qs.length:' question')+' · '+q.dataset;$('#question').textContent=q.question_display||q.question;$('#reference').textContent=ref(q);
 $('#prev').disabled=idx===0;$('#next').disabled=idx===qs.length-1;$('#prev').onclick=()=>navigate(state.panel,qs[idx-1].id);$('#next').onclick=()=>navigate(state.panel,qs[idx+1].id);
 const input=$('#input-player');input.replaceChildren(el('span','label','Spoken question'),audioPlayer(q.input,'spoken question',30));
 const players=$('#players');players.replaceChildren();
 for(const [label,ids] of GROUPS){const gl=el('div','group-label',label);if(ids.includes('grpo')){const k=el('span','star-key','⋆ trained in this work');gl.append(k)}players.append(gl);
  for(const mid of ids){const m=q.models.find(x=>x.id===mid);if(!m)continue;const card=el('article','card');card.dataset.model=m.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',m.label+' response');
   const head=el('header'),nm=el('div','name',m.label);if(m.id==='grpo'){const st=el('span','star','⋆');st.title='Model trained in this work';st.setAttribute('aria-label','trained in this work');nm.append(st)}head.append(nm,el('div','sub',m.subtitle));card.append(head);
   if(m.silent||!m.audio)card.append(silentStrip());else{const p=audioPlayer(m,m.label+' response');rowAudios.push(p.audio);card.append(p)}
   card.append(marks(m));
   const exd=m.text?excerptOf(m.text,ref(q)):{text:m.silent?'No spoken answer was produced.':'No transcript saved.',trimmed:false};const ex=highlight(exd.text,ref(q),'excerpt'+(state.excerpts?'':' hidden'));ex.title=exd.trimmed?'Excerpt with the opening filler omitted. Full transcript under Details.':'Excerpt. Full transcript under Details.';card.append(ex);
   const foot=el('footer'),btn=el('button','linkbtn','Details');btn.type='button';btn.onclick=e=>{e.stopPropagation();select(m.id,true)};const ns=m.calls.length;foot.append(btn,el('span',null,ns?ns+(ns===1?' search':' searches'):'No search'));card.append(foot);
   card.onclick=e=>{if(e.target.closest('.play,.seek,.linkbtn'))return;select(m.id,false)};card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(m.id,true)}};
   players.append(card)}}
 renderDetail(q);
 track('page_view',{page_title:document.title,page_location:location.href});track('question_view',{panel:state.panel,question_id:state.qid});
}
function select(id,scroll){state.selected=state.selected===id?null:id;renderDetail(current);if(state.selected){track('detail_open',{model:id,question_id:state.qid});if(scroll)$('#detail').scrollIntoView({behavior:'smooth',block:'nearest'})}}
function layout(){const panels=['sh','mh'].filter(p=>D.questions.some(q=>q.panel===p));if(!panels.includes(state.panel))state.panel=panels[0];for(const p of ['sh','mh'])$('#'+p+'-tab').hidden=!panels.includes(p);
 const single=D.questions.length===1;document.body.classList.toggle('single',single);$('.selectbar').hidden=single||panels.length<2&&D.questions.length<6;
 }
function composition(){}

$('#search').oninput=e=>{state.search=e.target.value;renderList()};
$('#qselect').onchange=e=>navigate(state.panel,e.target.value);
$('#speed').onchange=e=>{state.speed=Number(e.target.value);audios.forEach(a=>a.playbackRate=state.speed)};
$('#expand').onchange=e=>{state.excerpts=e.target.checked;document.querySelectorAll('.excerpt').forEach(x=>x.classList.toggle('hidden',!state.excerpts))};
$('#playall').onclick=()=>{const b=$('#playall');if(playAll){playAll=null;stopAll();b.classList.remove('active');return}if(!rowAudios.length)return;stopAll();playAll={list:rowAudios,i:0};b.classList.add('active');track('play_all',{question_id:state.qid});rowAudios[0].play().catch(()=>{playAll=null;b.classList.remove('active')})};
for(const p of ['sh','mh']){$('#'+p+'-tab').onclick=()=>navigate(p);$('#'+p+'-count').textContent=D.questions.filter(q=>q.panel===p).length}
addEventListener('hashchange',render);
addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='ArrowRight'&&!$('#next').disabled)$('#next').click();else if(e.key==='ArrowLeft'&&!$('#prev').disabled)$('#prev').click();else if(e.key==='Escape'&&state.selected){state.selected=null;renderDetail(current)}});
composition();layout();render();
