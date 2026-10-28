import {TINES,ORDER,detectPitch,nearestTine,centsBetween} from './pitch.js';
import {ReferenceTone} from './tone.js';
const $=id=>document.getElementById(id), tuner=document.querySelector('.tuner');
let locked=null, active=null, stream=null, context=null, analyser=null, frame=null, running=false, pending=false, epoch=0, history=[], lastValid=0, lastTick=0, lastAnnouncement='', stableCount=0;
const tone=new ReferenceTone();
let playingReference=false, playbackRequest=0;
const buttons=new Map();
for(const id of ORDER){const t=TINES[id-1],b=document.createElement('button');b.className='tine'+(t.note.startsWith('D')?' root':'');b.style.setProperty('--length',`${310-(id-1)*16}px`);b.dataset.id=id;b.setAttribute('aria-label',`Язычок ${id}, ${t.ru}, ${t.note}, послушать и выбрать для настройки`);b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="tine-num">${id}</span><span class="tine-note">${t.note.slice(0,-1)}<sup>${t.note.slice(-1)}</sup></span>`;b.onclick=()=>{select(t);playReference(t);};$('tines').append(b);buttons.set(id,b);}
function announce(s){if(s!==lastAnnouncement){$('announcement').textContent=s;lastAnnouncement=s;}}
function highlight(t,good=false){active=t;for(const[id,b]of buttons){b.classList.toggle('active',id===t?.id);b.classList.toggle('tuned',good&&id===t?.id);b.classList.toggle('locked',id===locked?.id);b.setAttribute('aria-pressed',String(id===locked?.id));}tuner.classList.toggle('good',good);}
function resetMeasurement(){history=[];stableCount=0;lastValid=0;$('needle').hidden=true;tuner.classList.remove('good');$('measurement').textContent='A4 = 440 Гц · допуск ±5 центов';}
function setNote(t){$('note').textContent=t?.note||'—';$('note-caption').textContent=t?`язычок №${t.id} · ${t.ru}`:'Твой следующий чистый звук';}
function select(t){locked=t;resetMeasurement();highlight(t);setNote(t);$('auto').classList.remove('selected');$('auto').setAttribute('aria-pressed','false');$('selection-hint').textContent=`Выбран №${t.id} · нажми «Авто» для отмены`;$('instruction').textContent=running?'Дёрни выбранный язычок':'Язычок выбран';$('detail').textContent=running?`Слушаем №${t.id} — ${t.note}`:'Включи микрофон, чтобы начать настройку.';announce(`Выбран язычок ${t.id}`);}
function cancelReference(){
 playbackRequest++;tone.stop();playingReference=false;
 for(const b of buttons.values())b.classList.remove('playing');
 if(!pending)$('status').textContent=running?'Микрофон слушает':'Микрофон выключен';
}
async function playReference(t){
 const request=++playbackRequest;playingReference=true;resetMeasurement();
 for(const[id,b]of buttons)b.classList.toggle('playing',id===t.id);
 $('status').textContent=running?'Эталон звучит · измерение на паузе':'Эталон звучит';
 $('instruction').textContent='Слушай эталон';
 $('detail').textContent=`${t.note} · ${t.freq.toFixed(2)} Гц`;
 $('measurement').textContent='Синтезированный звук · A4 = 440 Гц';
 announce(`Эталон ${t.note}, язычок ${t.id}`);
 try{
  await tone.play(t.freq,()=>{
   if(request!==playbackRequest)return;
   playingReference=false;for(const b of buttons.values())b.classList.remove('playing');
   resetMeasurement();lastValid=performance.now();
   $('status').textContent=running?'Микрофон слушает':pending?'Разреши доступ к микрофону':'Микрофон выключен';
   if(running)waiting();
   else{$('instruction').textContent='Послушать ещё раз?';$('detail').textContent='Нажми на язычок. Для настройки включи микрофон.';}
  });
 }catch{
  if(request!==playbackRequest)return;
  cancelReference();resetMeasurement();
  $('status').textContent=running?'Микрофон слушает':'Микрофон выключен';
  $('instruction').textContent='Не удалось включить звук';
  $('detail').textContent='Проверь громкость и нажми на язычок ещё раз.';
 }
}
$('auto').onclick=()=>{cancelReference();locked=null;resetMeasurement();highlight(null);setNote(null);$('auto').classList.add('selected');$('auto').setAttribute('aria-pressed','true');$('selection-hint').textContent='Нажми на язычок — послушай эталон';$('instruction').textContent=running?'Дёрни один язычок':'Начнём?';$('detail').textContent=running?'Дай предыдущему звуку затихнуть.':'Разреши микрофон, чтобы услышать калимбу.';};
function waiting(text='Дёрни один язычок',detail='Дай предыдущему звуку затихнуть.'){$('needle').hidden=true;tuner.classList.remove('good');highlight(locked);setNote(locked);$('instruction').textContent=locked?'Дёрни выбранный язычок':text;$('detail').textContent=detail;$('measurement').textContent='A4 = 440 Гц · допуск ±5 центов';}
function process(result,now){
 if(playingReference)return;
 if(!result){stableCount=0;if(now-lastValid>900){history=[];waiting();}return;}
 const t=locked||nearestTine(result.freq),c=centsBetween(result.freq,t.freq);
 if((!locked&&Math.abs(c)>48)||(locked&&Math.abs(c)>250)){
  if(now-lastValid>500){resetMeasurement();highlight(locked);setNote(locked);$('instruction').textContent=locked?'Проверь язычок':'Выбери язычок';$('detail').textContent=locked?'Звук далеко от цели. Проверь номер и повтори щипок.':'Коснись нужного язычка на схеме.';}return;
 }
 if(history.length&&(history.at(-1).id!==t.id||Math.abs(history.at(-1).c-c)>25)){history=[];stableCount=0;}
 history.push({id:t.id,c,f:result.freq});if(history.length>5)history.shift();
 if(history.length<3)return;
 const values=history.map(v=>v.c).sort((a,b)=>a-b),median=values[Math.floor(values.length/2)];
 if(values.at(-1)-values[0]>16){if(now-lastValid>900)waiting('Повтори щипок','Не удалось уверенно определить звук.');return;}
 lastValid=now;const inTune=Math.abs(median)<=5;stableCount=inTune?stableCount+1:0;const good=inTune&&stableCount>=3;
 highlight(t,good);setNote(t);$('needle').hidden=false;$('needle').style.left=`${50+Math.max(-50,Math.min(50,median))}%`;
 const freq=t.freq*2**(median/1200);$('measurement').textContent=`${freq.toFixed(1)} Гц · ${median>0?'+':''}${Math.round(median)} ц · цель ${t.freq.toFixed(1)} Гц`;
 let title,detail;if(good){title='Настроено';detail='Отлично. Можно перейти к следующему.';}else if(inTune){title='Почти готово';detail='Проверяем устойчивость звука…';}else if(median<0){title='Повысь звук';detail='Немного укороти свободную часть язычка.';}else{title='Понизь звук';detail='Немного удлини свободную часть язычка.';}
 $('instruction').textContent=title;$('detail').textContent=detail;announce(`Язычок ${t.id}. ${title}`);
}
function loop(now){if(!running)return;if(!playingReference&&now-lastTick>80){lastTick=now;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);process(detectPitch(data,context.sampleRate),now);}frame=requestAnimationFrame(loop);}
function stop(message='Микрофон выключен',description='Нажми кнопку, когда будешь готов продолжить.'){
 cancelReference();epoch++;pending=false;running=false;cancelAnimationFrame(frame);if(stream){for(const t of stream.getTracks()){t.onended=null;t.onmute=null;t.stop();}stream=null;}if(context){context.onstatechange=null;context.close().catch(()=>{});context=null;}analyser=null;resetMeasurement();highlight(locked);setNote(locked);$('status').textContent=message;$('status-dot').classList.remove('on');$('start').classList.remove('running');$('start').disabled=false;$('start').querySelector('span').textContent='Начать настройку';$('instruction').textContent=message==='Микрофон выключен'?'Пауза':'Продолжим?';$('detail').textContent=description;announce(message);
}
async function start(){
 if(running){stop();return;}if(pending)return;cancelReference();
 if(!navigator.mediaDevices?.getUserMedia){$('instruction').textContent='Микрофон недоступен';$('detail').textContent='Открой приложение по HTTPS в Safari или Chrome.';return;}
 pending=true;const request=++epoch;$('start').disabled=true;$('status').textContent='Разреши доступ к микрофону';$('instruction').textContent='Ждём разрешения';$('detail').textContent='Нажми «Разрешить» в запросе браузера.';
 try{
  const Ctx=window.AudioContext||window.webkitAudioContext;context=new Ctx();await context.resume();
  const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false});
  if(request!==epoch){acquired.getTracks().forEach(t=>t.stop());return;}
  stream=acquired;const source=context.createMediaStreamSource(stream),lp1=context.createBiquadFilter(),lp2=context.createBiquadFilter();for(const f of[lp1,lp2]){f.type='lowpass';f.frequency.value=1200;f.Q.value=.707;}
  analyser=context.createAnalyser();analyser.fftSize=8192;analyser.smoothingTimeConstant=0;source.connect(lp1).connect(lp2).connect(analyser);
  for(const track of stream.getAudioTracks()){track.onended=()=>stop('Микрофон отключился');track.onmute=()=>stop('Прослушивание прервано');}
  context.onstatechange=()=>{if(running&&['suspended','interrupted','closed'].includes(context?.state))stop('Прослушивание прервано');};
  cancelReference();running=true;pending=false;$('start').disabled=false;$('start').classList.add('running');$('start').querySelector('span').textContent='Остановить';$('status').textContent='Микрофон слушает';$('status-dot').classList.add('on');lastValid=performance.now();history=[];waiting();announce('Микрофон включён');frame=requestAnimationFrame(loop);
 }catch(e){if(request!==epoch)return;stop();const denied=['NotAllowedError','PermissionDeniedError'].includes(e.name);$('status').textContent=denied?'Нет доступа к микрофону':'Микрофон недоступен';$('instruction').textContent=denied?'Разреши микрофон':'Не удалось начать';$('detail').textContent=denied?'Открой разрешения сайта в браузере, включи микрофон и повтори.':e.name==='NotFoundError'?'Подключи микрофон и повтори.':'Закрой другие приложения с микрофоном и повтори.';announce($('detail').textContent);}
}
$('start').onclick=start;
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(running||pending||playingReference)stop('Настройка на паузе','Вернись к калимбе и нажми «Начать настройку».');tone.suspend();}});window.addEventListener('pagehide',()=>{stop();tone.suspend();});
$('help-open').onclick=()=>$('help').showModal();$('help-close').onclick=()=>$('help').close();$('help').addEventListener('click',e=>{if(e.target===$('help')){const r=$('help').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('help').close();}});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
