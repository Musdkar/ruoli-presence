import { selectVrchatPresence } from './lib/vrchat-presence.mjs';
/* KALIERI — AFTER HOURS
   A dependency-free interactive editorial prototype.
   Live information uses the preview-only anonymous /api/presence endpoint.
   Never invent or persist private telemetry. */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const safeParse = (value) => { if (value && typeof value === 'object') return value; try { return JSON.parse(value); } catch { return null; } };
const numberWithin = (value, max) => { const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN; return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
const fmt = (n) => n.toLocaleString('en-US');
const formatMinutes = (m) => m >= 60 ? `${Math.floor(m/60)}h ${Math.round(m%60)}m` : `${Math.round(m)}m`;
const SOURCE_ASSETS = 'https://kalieri.com/assets/';

/* Owner-side location, not the visitor's GPS.
   Fallback matches the current site setting. Future owner location telemetry
   can replace this one source without making a city part of the visual theme. */
const OWNER_LOCATION=Object.freeze({
  city:'Wuhan',region:'Hubei',country:'CN',
  latitude:30.5928,longitude:114.3055,timeZone:'Asia/Shanghai'
});
$('#weather-city').textContent=OWNER_LOCATION.city.toUpperCase();
$('#weather-region').textContent=`↗ ${OWNER_LOCATION.region.toUpperCase()}, ${OWNER_LOCATION.country}`;
// The map is a regional illustration, never a precise owner-location pin.
const mapLatitude=Math.round(OWNER_LOCATION.latitude*10)/10;
const mapLongitude=Math.round(OWNER_LOCATION.longitude*10)/10;
$('#location-map-link').href=`https://www.openstreetmap.org/#map=8/${mapLatitude}/${mapLongitude}`;
const mapBounds=[mapLongitude-1.2,mapLatitude-.7,mapLongitude+1.2,mapLatitude+.7].map(v=>v.toFixed(1)).join(',');
$('#location-map').src=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds)}&layer=mapnik`;


const photoData = [
  ['2026-10-05-155539','OCT 05, 2026','Library light / a fleeting afternoon'],
  ['2026-09-14-001659','SEP 14, 2026','Somewhere after midnight'],
  ['2026-09-06-022351','SEP 06, 2026','Another life, somewhere else'],
  ['2026-09-02-203912','SEP 02, 2026','A fragment worth keeping'],
  ['2026-08-30-014213','AUG 30, 2026','Places that only exist in memories'],
  ['2026-08-22-000356','AUG 22, 2026','In a different world'],
  ['2026-08-21-231339','AUG 21, 2026','Nighttime departures'],
  ['2026-08-21-230444','AUG 21, 2026','The featured memory'],
  ['2026-03-23-201936','MAR 23, 2026','A world worth visiting'],
  ['2026-02-24-174210','FEB 24, 2026','Captured in passing'],
  ['2026-02-21-091425','FEB 21, 2026','Another little somewhere'],
  ['2026-02-20-193440','FEB 20, 2026','Keeping the moment'],
  ['2026-02-17-092405','FEB 17, 2026','Digital postcard'],
  ['2026-02-16-233527','FEB 16, 2026','After hours'],
  ['2026-02-16-233419','FEB 16, 2026','The quieter corner'],
  ['2026-02-13-110049','FEB 13, 2026','A passing glimpse'],
  ['2026-02-13-105559','FEB 13, 2026','Somewhere between'],
  ['2026-02-13-105542','FEB 13, 2026','Across the horizon'],
  ['2026-02-11-215858','FEB 11, 2026','Where the archive began'],
];
const software = {
  development: [['VS Code','Editor'],['PyCharm','Python IDE'],['Ghostty','Terminal'],['Git','Version control']],
  ai: [['ChatGPT','Research & work'],['Claude Code','Building & coding']],
  vr: [['VRChat','Social VR'],['VRCX','VRChat companion'],['Virtual Desktop','Quest streaming']],
  daily: [['Obsidian','Knowledge & notes'],['Notion','Workspace'],['Microsoft Edge','Browser'],['MarkEdit','Markdown editor'],['Maccy','Clipboard manager']],
};
const blogPosts = [
  {title:'对抗无聊', subtitle:'Against boredom', date:'JAN 29, 2026', html:`<p>一些关于保持好奇心、对抗无聊的零散笔记。</p><ul><li>多接触日光，少接触能够快速大量产生多巴胺的活动。</li><li>每天接触 10–30 分钟的日光，可以每天早起去跑步。</li><li>褪黑素的长期使用会抑制多巴胺水平。</li><li>芝麻、奶酪、牛肉、鱼肉、坚果：补充酪氨酸，帮助多巴胺生成。</li><li>中午 12 点之前可以适当地喝一些咖啡，让多巴胺回路更加敏感。</li><li>在无聊的时候做一些主观上更难受的事，从而快速恢复状态。</li><li>在重复枯燥的工作中找到新鲜感。</li><li>学习另一门外语，或者从 <a target="_blank" rel="noreferrer" style="color:var(--lime)" href="https://www.imdb.com/chart/top/">IMDb Top 250 ↗</a> 开始看电影。</li></ul>`},
  {title:'1', subtitle:'Running log', date:'FEB 02, 2026', html:`<ol><li>1.30：2.74km</li><li>1.31：2.88km</li><li>2.01：2.92km</li><li>2.02：2.90km</li><li>2.03：2.85km</li><li>2.05：3.03km</li><li>2.07：2.67km</li><li>2.08：2.83km</li><li>2.09：2.94km</li><li>2.11：2.98km</li><li>2.12：2.77km</li><li>2.15：2.17km</li><li>2.17：2.64km</li><li>2.20：2.96km</li><li>2.23：2.85km</li><li>2.24：2.82km</li><li>3.02：2.42km</li><li>3.03：2.70km</li><li>3.04：2.97km</li><li>3.05：3.59km</li><li>3.06：2.98km</li><li>3.09：2.74km</li><li>3.10：3.17km</li></ol><p><a style="color:var(--lime)" href="https://kalieri.com/blog/2" target="_blank" rel="noreferrer">VIEW ORIGINAL ↗</a></p>`}
];

/* Editorial photo wall */
let visiblePhotos = 7;
function drawArchive(){
  const gallery=$('#archive-grid'); gallery.replaceChildren();
  photoData.slice(0,visiblePhotos).forEach(([id,date,caption],index)=>{
    const button=document.createElement('button');button.type='button';button.className='archive-frame reveal visible';
    button.setAttribute('aria-label',`View photo ${index+1}: ${caption}`);
    const fallback=document.createElement('div');fallback.className='image-fallback';button.append(fallback);
    const img=document.createElement('img'); img.src=`${SOURCE_ASSETS}photos/${id}.webp`;img.alt=caption;img.loading=index < 2?'eager':'lazy';img.decoding='async';
    img.onerror=()=>{img.remove();}; button.append(img);
    const tag=document.createElement('span');tag.className='frame-label';tag.textContent=index===0?'ON EARTH':'OTHER WORLDS';button.append(tag);
    const meta=document.createElement('span');meta.className='frame-meta';
    const no=document.createElement('b');no.textContent=`${String(index+1).padStart(2,'0')} / ${String(photoData.length).padStart(2,'0')}`;
    const day=document.createElement('span');day.textContent=date;meta.append(no,day);button.append(meta);
    button.addEventListener('click',()=>openPhoto(index));gallery.append(button);
  });
}
function renderTools(key='development'){
  const list=$('#tools-list');list.replaceChildren();
  (software[key]||[]).forEach(([name,meta],i)=>{
    const el=document.createElement('div');el.className='tool-item';el.style.animationDelay=`${i*45}ms`;
    const no=document.createElement('span');no.className='tool-item-number';no.textContent=String(i+1).padStart(2,'0');
    const title=document.createElement('strong');title.textContent=name;
    const detail=document.createElement('span');detail.textContent=meta;
    el.append(no,title,detail);list.append(el);
  });
  $$('.tool-tab').forEach(btn=>{let active=btn.dataset.tool===key;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));});
}
$$('.tool-tab').forEach(b=>b.addEventListener('click',()=>renderTools(b.dataset.tool)));
drawArchive();renderTools();
const archiveViewMore=document.createElement('button');archiveViewMore.className='underline-link';archiveViewMore.style.cssText='border:0;background:none;font:10px var(--mono);cursor:pointer;';archiveViewMore.textContent='SHOW ALL 19 FRAGMENTS ↗';
const archiveEnd=$('.archive-end');archiveEnd.insertBefore(archiveViewMore,archiveEnd.lastElementChild);
archiveViewMore.addEventListener('click',()=>{visiblePhotos=visiblePhotos===7?photoData.length:7;drawArchive();archiveViewMore.textContent=visiblePhotos===7?'SHOW ALL 19 FRAGMENTS ↗':'SHOW LESS ↑';archiveViewMore.scrollIntoView({block:'nearest',behavior:'smooth'});});

/* Modal: journal and lightbox */
const modal=$('#modal-backdrop'); const modalContent=$('#modal-content');let restoreFocus=null;
function showModal(content,mode='article'){restoreFocus=document.activeElement;modalContent.innerHTML=content;modal.classList.toggle('is-photo',mode==='photo');$('.modal-panel').classList.toggle('photo-mode',mode==='photo');modal.hidden=false;document.body.style.overflow='hidden';$('#modal-close').focus();}
function hideModal(){modal.hidden=true;modal.classList.remove('is-photo');$('.modal-panel').classList.remove('photo-mode');modalContent.replaceChildren();document.body.style.overflow='';restoreFocus?.focus?.();}
let activePhotoIndex=-1;
function viewPhoto(index){
  activePhotoIndex=(index+photoData.length)%photoData.length;
  const [id,date,caption]=photoData[activePhotoIndex];
  const img=$('#photo-viewer-image');if(!img)return;
  img.src=`${SOURCE_ASSETS}photos/${id}.webp`;img.alt=caption;
  $('#modal-title').textContent=caption;
  $('#photo-viewer-date').textContent=date;
  $('#photo-viewer-count').textContent=`${String(activePhotoIndex+1).padStart(2,'0')} / ${String(photoData.length).padStart(2,'0')}`;
  for(const offset of [-1,1]){const next=new Image();next.src=`${SOURCE_ASSETS}photos/${photoData[(activePhotoIndex+offset+photoData.length)%photoData.length][0]}.webp`;}
}
function openPhoto(index){
  showModal(`<div class="photo-viewer">
   <div class="photo-viewer-head"><span>THE MEMORY VAULT / 19 FRAGMENTS</span><span id="photo-viewer-count" aria-live="polite"></span></div>
   <div class="photo-viewer-stage" id="photo-viewer-stage">
    <button class="photo-nav photo-prev" type="button" aria-label="Previous photograph">←</button>
    <img id="photo-viewer-image" alt="" draggable="false">
    <button class="photo-nav photo-next" type="button" aria-label="Next photograph">→</button>
   </div>
   <div class="photo-viewer-foot"><div><h2 class="photo-viewer-title" id="modal-title"></h2><span id="photo-viewer-date"></span></div><span class="photo-viewer-help">← → ARROWS · SWIPE · ESC</span></div>
  </div>`,'photo');
  $('.photo-prev').addEventListener('click',()=>viewPhoto(activePhotoIndex-1));
  $('.photo-next').addEventListener('click',()=>viewPhoto(activePhotoIndex+1));
  let down=null;
  const stage=$('#photo-viewer-stage');
  stage.addEventListener('pointerdown',e=>{if(!e.target.closest('button'))down={x:e.clientX,id:e.pointerId};});
  stage.addEventListener('pointerup',e=>{if(down&&down.id===e.pointerId&&Math.abs(e.clientX-down.x)>55)viewPhoto(activePhotoIndex+(e.clientX<down.x?1:-1));down=null;});
  stage.addEventListener('pointercancel',()=>{down=null;});
  viewPhoto(index);
}
$$('.journal-entry').forEach(b=>b.addEventListener('click',()=>{const post=blogPosts[Number(b.dataset.post)];showModal(`<p class="modal-type">INTERNET FIELD NOTES / ${post.date}</p><h2 class="modal-title" id="modal-title">${post.title}</h2><p class="modal-sub">${post.subtitle} · ${post.date}</p><div class="modal-body">${post.html}</div>`);}));
$('#modal-close').addEventListener('click',hideModal);modal.addEventListener('click',e=>{if(e.target===modal)hideModal();});

/* Command jump */
const command=$('#command-backdrop');let commandFocus=null;
function openCommand(){commandFocus=document.activeElement;command.hidden=false;$('.command-options button').focus();}
function closeCommand(){command.hidden=true;commandFocus?.focus?.();}
$('#command-open').addEventListener('click',openCommand);$('#floating-console').addEventListener('click',openCommand);
command.addEventListener('click',e=>{if(e.target===command)closeCommand();});
$$('.command-options button').forEach(b=>b.addEventListener('click',()=>{const target=b.dataset.target;closeCommand();$(target)?.scrollIntoView({behavior:'smooth',block:'start'});}));
document.addEventListener('keydown',e=>{if(!modal.hidden&&modal.classList.contains('is-photo')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();viewPhoto(activePhotoIndex+(e.key==='ArrowRight'?1:-1));return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();command.hidden?openCommand():closeCommand();}if(e.key==='Escape'){if(!modal.hidden)hideModal();if(!command.hidden)closeCommand();}});
$('#back-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* Keyboard-shaped privacy-preserving heatmaps */
const macKeyboardRows=[
  [['ESC','ESC',1.3],['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['7','7'],['8','8'],['9','9'],['0','0'],['-','MINUS'],['=','EQUAL']],
  [['TAB','TAB',1.5],...'QWERTYUIOP'.split('').map(x=>[x,x]),['[','BRACKETLEFT'],[']','BRACKETRIGHT']],
  [['CAPS','CAPSLOCK',1.8],...'ASDFGHJKL'.split('').map(x=>[x,x]),[';','SEMICOLON'],["'",'QUOTE'],['↵','ENTER',1.9]],
  [['SHIFT','SHIFT',2],...'ZXCVBNM'.split('').map(x=>[x,x]),[',','COMMA'],['.','PERIOD'],['/','SLASH'],['SHIFT','SHIFT',2]],
  [['CTRL','CONTROL',1.25],['⌥','ALT',1.25],['⌘','META',1.25],['','SPACE',6],['⌘','META',1.25],['←','ARROWLEFT'],['↓','ARROWDOWN'],['→','ARROWRIGHT']]
];
const winKeyboardRows=[
  [['ESC','ESC'],...'F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12'.split(' ').map(k=>[k,k]),['DEL','DELETE',1.4]],
  [['~','BACKQUOTE'],...'1234567890'.split('').map(x=>[x,x]),['-','MINUS'],['=','EQUAL'],['⌫','BACKSPACE',2.2]],
  [['TAB','TAB',1.6],...'QWERTYUIOP'.split('').map(x=>[x,x]),['[','BRACKETLEFT'],[']','BRACKETRIGHT'],['\\','BACKSLASH',1.4]],
  [['CAPS','CAPSLOCK',1.8],...'ASDFGHJKL'.split('').map(x=>[x,x]),[';','SEMICOLON'],["'",'QUOTE'],['↵','ENTER',2.2]],
  [['SHIFT','SHIFT',2.3],...'ZXCVBNM'.split('').map(x=>[x,x]),[',','COMMA'],['.','PERIOD'],['/','SLASH'],['SHIFT','SHIFT',2.5]],
  [['CTRL','CONTROL',1.2],['⊞','META',1.2],['ALT','ALT',1.2],['','SPACE',5],['ALT','ALT',1.2],['FN','FN',1],['MENU','CONTEXTMENU',1.2],['CTRL','CONTROL',1.2],['←','ARROWLEFT'],['↓','ARROWDOWN'],['→','ARROWRIGHT']]
];
let keyboards={mac:null,win:null},activeKeyboard='mac';
function drawKeyboard(){
  const item=keyboards[activeKeyboard];$('#keyboard-total').textContent=item?fmt(item.total):'—';const outer=$('#keyboard-visual');outer.replaceChildren();
  outer.classList.toggle('is-windows',activeKeyboard==='win');const layout=activeKeyboard==='win'?winKeyboardRows:macKeyboardRows;
  layout.forEach((row)=>{const r=document.createElement('div');r.className='kb-row';row.forEach(([label,key,size=1])=>{
    const val=item?.heat?.[key]??item?.heat?.[label]??0;
    const el=document.createElement('div');el.className='kb-key';el.style.setProperty('--heat',String(Math.min(1,Math.max(0,Number(val)/15||0))));el.style.setProperty('--size',size);el.textContent=label;el.title=key;r.append(el);
  });outer.append(r);});
}
$$('.kb-tab').forEach(btn=>btn.addEventListener('click',()=>{activeKeyboard=btn.dataset.kb;$$('.kb-tab').forEach(b=>b.classList.toggle('active',b===btn));drawKeyboard();}));drawKeyboard();
function normalKeyboard(value){let d=safeParse(value);if(!d||d.v!==1||!d.heat||typeof d.heat!=='object')return null;let total=numberWithin(d.total,1e7);if(total===null)return null;return {total,heat:Object.fromEntries(Object.entries(d.heat).filter(([k,v])=>typeof k==='string'&&numberWithin(v,15)!==null).slice(0,100))};}
function normalizeApps(value){let d=safeParse(value);if(!d||!Array.isArray(d.apps))return [];return d.apps.filter(v=>v&&typeof v.name==='string'&&v.name.length<=120&&numberWithin(v.minutes,1440)!==null).slice(0,8).map(v=>({name:v.name,minutes:Number(v.minutes)}));}
function appUsage(kv){const merged=new Map();for(const app of [...normalizeApps(kv.apps_today_mac||kv.apps_today),...normalizeApps(kv.apps_today_win)])merged.set(app.name,(merged.get(app.name)||0)+app.minutes);return [...merged].map(([name,minutes])=>({name,minutes})).sort((a,b)=>b.minutes-a.minutes).slice(0,8);}
function drawApps(apps){const list=$('#app-list');if(!apps.length)return;list.replaceChildren();const max=Math.max(1,...apps.map(a=>a.minutes));apps.forEach((a,i)=>{
  const row=document.createElement('div');row.className='app-row';const num=document.createElement('span');num.className='app-num';num.textContent=String(i+1).padStart(2,'0');
  const name=document.createElement('span');name.className='app-name';name.textContent=a.name;name.title=a.name;
  const track=document.createElement('span');track.className='app-bar';const bar=document.createElement('i');bar.style.width=`${Math.max(3,a.minutes/max*100)}%`;track.append(bar);
  const time=document.createElement('time');time.className='app-time';time.textContent=formatMinutes(a.minutes);row.append(num,name,track,time);list.append(row);
});}

function musicRecord(v,spotify){const raw=safeParse(v);let song=null;
  if(raw && raw.v===1 && raw.track && typeof raw.track.title==='string' && typeof raw.track.artist==='string') {
    const goodAge=raw.observedAt && Date.now()-Date.parse(raw.observedAt)<90*1000 && Date.now()-Date.parse(raw.observedAt)>-5*60*1000;
    song={title:raw.track.title.slice(0,150),artist:raw.track.artist.slice(0,150),artwork:raw.artwork?.url,service:raw.service,state:goodAge?raw.state:'last_played'};
  } else if(raw && typeof raw.title==='string' && typeof raw.artist==='string') {
    song={title:raw.title,artist:raw.artist,artwork:raw.cover,service:raw.source,state:'last_played'};
  }
  if(spotify?.song && spotify?.artist && song?.state!=='playing' && song?.state!=='paused')return {title:spotify.song,artist:spotify.artist,artwork:spotify.album_art_url,service:'spotify',state:'playing'};
  return song;
}
function updateMusic(song){if(!song)return;
  $('#music-title').textContent=song.title;$('#music-artist').textContent=song.artist;$('#music-service').textContent=(song.service||'music').replaceAll('_',' ').toUpperCase();
  $('#music-state').textContent=song.state==='playing'?'♫ NOW PLAYING':song.state==='paused'?'Ⅱ PAUSED':'↺ LAST PLAYED';
  const artwork=typeof song.artwork==='string' && (/^https:\/\//.test(song.artwork)||/^data:image\/(jpeg|png|webp);base64,[\w+/=]+$/.test(song.artwork)&&song.artwork.length<=26000) ? song.artwork:null;
  const image=$('#album-image');if(artwork){image.src=artwork;image.hidden=false;$('#album-placeholder').hidden=true;image.onerror=()=>{image.hidden=true;$('#album-placeholder').hidden=false;};}
  else{image.hidden=true;$('#album-placeholder').hidden=false;}
  $('.equalizer').style.opacity=song.state==='playing'?'1':'.3';
  $('.tile-music').classList.toggle('is-playing',song.state==='playing');
}
function updateStatus(presence){const kv=presence?.kv||{};let label=null,source='Reality status',status='unknown';
  if(kv.phone_presence!==undefined){const p=safeParse(kv.phone_presence);const ts=Date.parse(p?.updatedAt||'');
    if(['online','dnd','sleeping'].includes(p?.status)&&Number.isFinite(ts)&&ts<=Date.now()+300000&&Date.now()-ts<=36*60*60*1000){status=p.status;label={online:'Online',dnd:'Do not disturb',sleeping:'Sleeping'}[p.status];source='iPhone';}else{label='Not synced';source='iPhone';}
  } else if(presence) {status=presence.discord_status||'offline';label={online:'Online',idle:'Idle',dnd:'Do not disturb',offline:'Offline'}[status]||'Unknown';}
  if(!label) return;$('#presence-title').innerHTML=label.replace(/ ([^ ]+)$/, '<br>$1')+'<span class="accent-period">.</span>';
  $('#presence-source').textContent=source;$('#hero-status').textContent=status==='online'?'SIGNAL ONLINE':status==='dnd'?'IN FOCUS':status==='sleeping'?'IN DREAM MODE':status==='idle'?'IDLE / AWAY':'SIGNAL '+status.toUpperCase();
  $('#presence-dot').style.background={online:'#6fcf97',dnd:'#eb5757',sleeping:'var(--violet)',idle:'#f2c94c'}[status]||'var(--dim)';
}
let lastPresence = null, lastPresenceReceivedAt = NaN;
const vrAvatar = $('#vr-avatar'), vrWorldImage = $('#vr-world-image'), vrPortal = $('.tile-portal');
const defaultVrAvatar = new URL('./assets/map-avatar.webp', document.baseURI).href;
let requestedAvatar = null, requestedWorldImage = null;
vrAvatar.addEventListener('error',()=>{if(vrAvatar.src!==defaultVrAvatar)vrAvatar.src=defaultVrAvatar;});
vrWorldImage.addEventListener('load',()=>{if(requestedWorldImage&&vrWorldImage.src===requestedWorldImage){vrWorldImage.hidden=false;vrPortal.classList.add('has-world-image');}});
vrWorldImage.addEventListener('error',()=>{vrWorldImage.hidden=true;vrPortal.classList.remove('has-world-image');});
function updateVR(presence){
  const view = selectVrchatPresence(presence, lastPresenceReceivedAt);
  vrPortal.classList.toggle('is-live', view.live);
  $('#vr-name').textContent = view.name;
  $('#vr-availability').textContent = view.availabilityLabel;
  $('#vr-status-dot').dataset.tone = view.availabilityTone;
  $('#vr-status-dot').classList.toggle('is-hollow', view.availabilityHollow);
  const avatar = view.avatarUrl || defaultVrAvatar;
  if(avatar!==requestedAvatar){requestedAvatar=avatar;vrAvatar.src=avatar;}
  vrAvatar.alt = `${view.name} — VRChat avatar`;
  if(view.worldImageUrl!==requestedWorldImage){
    requestedWorldImage=view.worldImageUrl;vrWorldImage.hidden=true;vrPortal.classList.remove('has-world-image');
    if(requestedWorldImage)vrWorldImage.src=requestedWorldImage;else vrWorldImage.removeAttribute('src');
  }
  $('#vr-title').textContent = view.title;
  $('#vr-title').title = view.title;
  $('#vr-detail').textContent = view.detail;
  $('#vr-state').textContent = view.state;
  $('#vr-source').textContent = view.source;
}
function refreshCachedPresence(){
  updateStatus(lastPresence);
  updateVR(lastPresence);
}
function updateHealth(v){const d=safeParse(v);if(!d||typeof d!=='object')return;const steps=numberWithin(d.steps,1e6);if(steps===null)return;
  $('#steps-number').textContent=fmt(Math.round(steps));const percent=Math.min(1,steps/6000);$('#steps-progress').style.strokeDashoffset=String(647.17*(1-percent));$('#steps-percent').textContent=`${Math.round(percent*100)}% OF DAILY GOAL`;
}
async function fetchPresence(){const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),8000);
  try{const response=await fetch('/api/presence',{signal:ctrl.signal,cache:'no-cache'});if(!response.ok)throw new Error(String(response.status));const j=await response.json();
    const data=j?.data && j.success!==undefined ? j.data : j;if(!data||typeof data!=='object')return;
    lastPresence=data;lastPresenceReceivedAt=Date.now();refreshCachedPresence();const kv=data.kv||{};updateHealth(kv.health_today);drawApps(appUsage(kv));
    keyboards={mac:normalKeyboard(kv.keyboard_today_mac||kv.keyboard_today||kv.keyboard_yesterday),win:normalKeyboard(kv.keyboard_today_win)};drawKeyboard();updateMusic(musicRecord(kv.music_now,data.spotify));
  }catch{ /* Do not invent a status or erase last known values on failure. */ }
  finally{clearTimeout(timeout);refreshCachedPresence();}
}
let liveTimer=null;function setPolling(){if(document.visibilityState==='visible'){refreshCachedPresence();if(!liveTimer){fetchPresence();liveTimer=setInterval(()=>{refreshCachedPresence();fetchPresence();},10000);}}else if(liveTimer){clearInterval(liveTimer);liveTimer=null;}}
document.addEventListener('visibilitychange',setPolling);setPolling();

/* Owner's current location: weather from Open-Meteo */
const weatherText={0:['Clear skies','☼'],1:['Mainly clear','☀'],2:['Partly cloudy','◒'],3:['Overcast','☁'],45:['Foggy','≋'],48:['Foggy','≋'],51:['Light drizzle','☂'],53:['Drizzle','☂'],55:['Heavy drizzle','☂'],61:['Light rain','☂'],63:['Rain','☂'],65:['Heavy rain','☂'],71:['Light snow','✳'],73:['Snow','✳'],75:['Heavy snow','✳'],80:['Showers','☂'],81:['Showers','☂'],82:['Heavy showers','☂'],95:['Thunderstorm','ϟ']};
(async function fetchWeather(){try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${OWNER_LOCATION.latitude}&longitude=${OWNER_LOCATION.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=${encodeURIComponent(OWNER_LOCATION.timeZone)}`;const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),7000);const response=await fetch(url,{signal:ctrl.signal});clearTimeout(timeout);if(!response.ok)throw Error();const d=(await response.json()).current;const temp=Number(d?.temperature_2m);if(!Number.isFinite(temp))throw Error();
  $('#weather-temp').innerHTML=`${Math.round(temp)}<sup>°</sup>`;const [condition,icon]=weatherText[d.weather_code]||['Current conditions','◌'];$('#weather-desc').textContent=condition;$('#weather-icon').textContent=icon;
  $('#weather-feels').textContent=Number.isFinite(d.apparent_temperature)?`${Math.round(d.apparent_temperature)}°`:'--°';$('#weather-wind').textContent=Number.isFinite(d.wind_speed_10m)?`${Math.round(d.wind_speed_10m)} KM/H`:'-- KM/H';
}catch{$('#weather-desc').textContent='Atmosphere unavailable';}})();

/* Local time, scroll meters, reveal choreography */
function tick(){const fmtTime=new Intl.DateTimeFormat('en-GB',{timeZone:OWNER_LOCATION.timeZone,hour:'2-digit',minute:'2-digit',hour12:false});$('#nav-time').textContent=`LOCAL · ${fmtTime.format(new Date())}`;}
tick();setInterval(tick,30000);
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.09,rootMargin:'0px 0px -35px 0px'});
$$('.reveal').forEach(el=>observer.observe(el));
const sectionObs=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;$$('.desktop-nav a').forEach(a=>a.classList.toggle('active',a.dataset.nav===entry.target.id));});},{threshold:.2,rootMargin:'-15% 0px -50% 0px'});
$$('#signal,#archive,#journal,#uses').forEach(e=>sectionObs.observe(e));
let scrollScheduled=false;window.addEventListener('scroll',()=>{if(!scrollScheduled){requestAnimationFrame(()=>{$('#scroll-progress').style.width=`${100*window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)}%`;scrollScheduled=false;});scrollScheduled=true;}},{passive:true});

/* Scroll-directed composition: RAF-limited transforms and a scrubbed photographic interlude.
   We animate only opacity / transforms; a single rAF reads geometry, then writes styles.
   Reduced-motion visitors get the complete content without sticky or parallax. */
const heroScene = $('.hero');
const worldline = $('#worldline');
const worldlineSticky = $('.worldline-sticky');
const chapterRail = $('.chapter-rail');
const storyStages = [
  {name:'IN THE PHYSICAL', caption:'A life made of ordinary afternoons.'},
  {name:'BETWEEN SIGNALS', caption:'Some of the best places have no address.'},
  {name:'IN OTHER WORLDS', caption:'The worlds we visit become part of who we are.'},
];
const chapterEntries = [
  {el:heroScene, name:'THE BEGINNING', index:'00'},
  {el:$('#signal'), name:'THE SIGNAL', index:'01'},
  {el:worldline, name:'BETWEEN WORLDS', index:'01.5'},
  {el:$('#archive'), name:'THE ARCHIVE', index:'02'},
  {el:$('#journal'), name:'FIELD NOTES', index:'03'},
  {el:$('#uses'), name:'THE TOOLKIT', index:'04'},
  {el:$('#contact'), name:'SAY HELLO', index:'05'},
];
const clamp01 = (x) => Math.max(0,Math.min(1,x));
let scrollFrame=null, motionCache={chapter:-1,stage:-1};
function renderScrollScenes(){
  scrollFrame=null;
  const y=window.scrollY, vh=window.innerHeight;
  const maxScroll=Math.max(1,document.documentElement.scrollHeight-vh);
  const progress=clamp01(y/maxScroll);
  $('#scroll-progress').style.width=`${progress*100}%`;
  $('#chapter-rail-progress').style.transform=`scaleY(${progress})`;
  chapterRail.classList.toggle('is-visible',y>vh*.55 && y<maxScroll-vh*.2);
  let currentChapter=0;
  for(let i=chapterEntries.length-1;i>=0;i--){
    if(y+vh*.42>=chapterEntries[i].el.getBoundingClientRect().top+y){
      currentChapter=i;
      if(motionCache.chapter!==i){motionCache.chapter=i;$('#chapter-count').innerHTML=`${chapterEntries[i].index} <i>/</i> 05`;$('#chapter-name').textContent=chapterEntries[i].name;}
      break;
    }
  }
  const currentId=chapterEntries[currentChapter].el.id;
  const navId=['signal','archive','journal','uses'].includes(currentId)?currentId:null;
  $$('.desktop-nav a[data-nav]').forEach(link=>{
    const active=link.dataset.nav===navId;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  });
  if(reducedMotion)return;
  for(const intro of $$('.section-intro')){
    const r=intro.getBoundingClientRect();
    if(r.top<vh*1.2&&r.bottom>-vh*.2){
      const p=clamp01((vh-r.top)/(vh+r.height));
      intro.style.setProperty('--section-shift',`${((p-.5)*40).toFixed(1)}px`);
    }
  }
  if(y<vh*1.8){
    const p=clamp01(y/Math.max(heroScene.offsetHeight,1));
    heroScene.style.setProperty('--hero-lift',`${(-p*132).toFixed(1)}px`);
    heroScene.style.setProperty('--hero-scale',(1+p*.24).toFixed(4));
    heroScene.style.setProperty('--hero-tilt',`${(p*17).toFixed(2)}deg`);
    heroScene.style.setProperty('--hero-title-lift',`${(-p*63).toFixed(1)}px`);
    heroScene.style.setProperty('--hero-content-opacity',(1-p*.48).toFixed(3));
    heroScene.style.setProperty('--hero-art-opacity',(1-p*.65).toFixed(3));
  }
  const storyTop=worldline.getBoundingClientRect().top+y;
  const travel=Math.max(1,worldline.offsetHeight-vh);
  if(y>=storyTop-vh && y<=storyTop+worldline.offsetHeight){
    const p=clamp01((y-storyTop)/travel);
    worldlineSticky.style.setProperty('--story-progress',p.toFixed(4));
    worldlineSticky.style.setProperty('--scene-depth',`${(p*205).toFixed(1)}px`);
    worldlineSticky.style.setProperty('--scene-depth-alt',`${(-p*220).toFixed(1)}px`);
    worldlineSticky.style.setProperty('--scene-rise',`${(-p*115).toFixed(1)}px`);
    worldlineSticky.style.setProperty('--scene-turn',`${(p*17).toFixed(2)}deg`);
    worldlineSticky.style.setProperty('--scene-earth-x',`${(-p*77).toFixed(1)}px`);
    worldlineSticky.style.setProperty('--scene-earth-y',`${(p*46).toFixed(1)}px`);
    worldlineSticky.style.setProperty('--scene-digital-y',`${(p*80).toFixed(1)}px`);
    worldlineSticky.style.setProperty('--story-travel',`${Math.round(p*100)}%`);
    // Discrete copy changes only when the visual chapter changes.
    const stage=Math.min(2,Math.floor(p*3));
    if(stage!==motionCache.stage){
      motionCache.stage=stage;worldlineSticky.dataset.stage=String(stage);
      $('#worldline-stage-index').textContent=String(stage+1).padStart(2,'0');
      $('#worldline-stage-name').textContent=storyStages[stage].name;
      $('#worldline-caption').textContent=storyStages[stage].caption;
    }
  }
}
function scheduleScrollRender(){if(scrollFrame===null)scrollFrame=requestAnimationFrame(renderScrollScenes);}
window.addEventListener('scroll',scheduleScrollRender,{passive:true});
window.addEventListener('resize',scheduleScrollRender,{passive:true});
// After page render: calculate the accurate scrub range and react to deep links.
requestAnimationFrame(renderScrollScenes);

/* The archive is a flat gallery until explored: pointer motion adds just a
   few pixels of photographic depth, without forcing repaint of the full grid. */
if(!reducedMotion && window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  const grid=$('#archive-grid');
  grid.addEventListener('pointermove',e=>{
    const frame=e.target.closest('.archive-frame');if(!frame)return;
    const b=frame.getBoundingClientRect();
    const x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;
    frame.style.setProperty('--photo-x',`${(x*-11).toFixed(1)}px`);
    frame.style.setProperty('--photo-y',`${(y*-11).toFixed(1)}px`);
  },{passive:true});
  grid.addEventListener('pointerout',e=>{
    const frame=e.target.closest('.archive-frame');
    if(frame && !frame.contains(e.relatedTarget)){
      frame.style.removeProperty('--photo-x');frame.style.removeProperty('--photo-y');
    }
  });
}


/* A real textured Earth, gently rotating on the existing orbital stage.
   Built directly on WebGL 1 to avoid a 3D framework in the initial bundle.
   If WebGL, images, or context recovery fail, the CSS Blue Marble fallback
   remains visible. Reduced-motion renders one static frame only. */
(function initEarth(){
  const canvas=$('#earth-canvas');
  if(!canvas)return;
  let gl;
  try{gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true,powerPreference:'low-power'});}catch{return;}
  if(!gl)return;
  const vertex='attribute vec2 pos; varying vec2 v; void main(){v=(pos+1.0)*0.5;gl_Position=vec4(pos,0.0,1.0);}';
  const fragment=`precision highp float;
varying vec2 v;
uniform sampler2D dayMap;
uniform sampler2D cloudMap;
uniform float spin;
uniform float pitch;
uniform vec2 ownerUV;
void main(){
  vec2 p=(v-0.5)*2.0;
  p.y=-p.y;
  float r2=dot(p,p);
  if(r2>=1.0)discard;
  float z=sqrt(max(0.0,1.0-r2));
  vec3 n=vec3(p.x,p.y,z);
  float c=cos(pitch),s=sin(pitch);
  vec3 turned=vec3(n.x,n.y*c-n.z*s,n.y*s+n.z*c);
  float lon=atan(turned.x,turned.z);
  float lat=asin(clamp(turned.y,-1.0,1.0));
  vec2 uv=vec2(fract(0.5+lon/6.283185307+spin),0.5+lat/3.141592654);
  vec3 earth=texture2D(dayMap,uv).rgb;
  vec3 cloud=texture2D(cloudMap,vec2(fract(uv.x+0.007),uv.y)).rgb;
  float cloudMask=smoothstep(0.42,0.84,dot(cloud,vec3(0.33333)))*0.49;
  earth=mix(earth,vec3(0.90,0.94,1.0),cloudMask);
  float sun=dot(n,normalize(vec3(-0.54,0.47,0.91)));
  float light=0.18+0.90*smoothstep(-0.58,0.80,sun);
  vec3 color=earth*light*vec3(0.97,1.02,1.09);
  float rim=pow(1.0-z,4.0);
  color+=vec3(0.17,0.50,0.98)*rim*0.69;
  // A quiet pinpoint marking the owner's chosen location.
  float longitudeDelta=abs(fract(uv.x-ownerUV.x+0.5)-0.5)*6.283185307;
  float latitudeDelta=(uv.y-ownerUV.y)*3.141592654;
  float marker=exp(-900.0*(longitudeDelta*longitudeDelta+latitudeDelta*latitudeDelta))*0.40;
  color+=vec3(0.71,1.0,0.54)*marker;
  gl_FragColor=vec4(color,1.0);
}`;
  function shader(type,src){
    const item=gl.createShader(type);gl.shaderSource(item,src);gl.compileShader(item);
    if(!gl.getShaderParameter(item,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(item));
    return item;
  }
  let program;
  try{
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  }catch{canvas.hidden=true;return;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const aPos=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
  const spinUniform=gl.getUniformLocation(program,'spin');
  const pitchUniform=gl.getUniformLocation(program,'pitch');
  const ownerUniform=gl.getUniformLocation(program,'ownerUV');
  gl.uniform2f(ownerUniform,0.5+OWNER_LOCATION.longitude/360,0.5+OWNER_LOCATION.latitude/180);
  const samplers=['dayMap','cloudMap'];
  samplers.forEach((name,i)=>gl.uniform1i(gl.getUniformLocation(program,name),i));
  let ready=false,visible=false,lost=false,raf=0;
  const natural=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const control=$('#earth-control'),reset=$('#earth-reset');
  // The globe's camera follows the owner's location data; city names belong
  // in the weather/map UI, never in the homepage's identity or captions.
  const HOME_LATITUDE=OWNER_LOCATION.latitude*Math.PI/180;
  const HOME_SPIN=OWNER_LOCATION.longitude/360;
  const HOME_PITCH=-HOME_LATITUDE;
  let yaw=0,pitch=HOME_PITCH,velocityX=0,velocityY=0,drag=null,hovered=false;
  let autoSpin=0,lastFrame=0,lastGesture=0;
  let returnHome=null;
  const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
  // Smoothly recenter to the owner's latest location; never use device location
  // or request visitor geolocation for this author-specific personal site.
  const resetOrientation=()=>{
    const now=performance.now();
    returnHome={started:now,fromYaw:yaw+(hovered?0:Math.sin(autoSpin*6.283185307)*0.011*6.283185307),fromPitch:pitch};
    yaw=0;autoSpin=0;velocityX=0;velocityY=0;
    lastGesture=now;schedule();
  };
  control.addEventListener('pointerenter',()=>{hovered=true;});
  control.addEventListener('pointerleave',()=>{hovered=false;lastGesture=performance.now();schedule();});
  control.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    if(!ready||lost)return;
    event.preventDefault();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,t:performance.now()};
    velocityX=0;velocityY=0;returnHome=null;
    control.classList.add('is-dragging');
    control.setPointerCapture(event.pointerId);
    lastGesture=performance.now();schedule();
  });
  control.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const now=performance.now();
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    const dt=Math.max(10,now-drag.t);
    const factor=Math.PI/Math.max(260,control.getBoundingClientRect().width);
    yaw-=dx*factor;
    pitch=clamp(pitch-dy*factor,-1.47,1.47);
    velocityX=clamp((-dx*factor/dt)*16,-0.045,0.045);
    velocityY=clamp((-dy*factor/dt)*16,-0.045,0.045);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,t:now};
    lastGesture=now;schedule();
  });
  function release(event){
    if(!drag||event.pointerId!==drag.id)return;
    if(event.type==='pointercancel'){velocityX=0;velocityY=0;}
    drag=null;control.classList.remove('is-dragging');
    if(control.hasPointerCapture(event.pointerId))control.releasePointerCapture(event.pointerId);
    lastGesture=performance.now();schedule();
  }
  control.addEventListener('pointerup',release);
  control.addEventListener('pointercancel',release);
  control.addEventListener('keydown',event=>{
    const step=event.shiftKey?0.35:0.13;
    if(event.key==='ArrowLeft')yaw-=step;
    else if(event.key==='ArrowRight')yaw+=step;
    else if(event.key==='ArrowUp')pitch=clamp(pitch+step,-1.47,1.47);
    else if(event.key==='ArrowDown')pitch=clamp(pitch-step,-1.47,1.47);
    else if(event.key.toLowerCase()==='r'){
      event.preventDefault();
      resetOrientation();
      return;
    }
    else return;
    event.preventDefault();returnHome=null;velocityX=0;velocityY=0;lastGesture=performance.now();schedule();
  });
  control.addEventListener('dblclick',resetOrientation);
  reset.addEventListener('click',resetOrientation);

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,1.8);
    const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  }
  function draw(t){
    raf=0;
    if(!ready||lost||document.hidden||!visible)return;
    resize();
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const dt=lastFrame?Math.min(64,Math.max(0,t-lastFrame)):16;
    lastFrame=t;
    if(returnHome){
      const fraction=clamp((t-returnHome.started)/(natural?1:850),0,1);
      const ease=1-Math.pow(1-fraction,3);
      // Shortest longitude route prevents an unnecessary multi-turn reset.
      const shortest=Math.atan2(Math.sin(returnHome.fromYaw),Math.cos(returnHome.fromYaw));
      yaw=shortest*(1-ease);
      pitch=returnHome.fromPitch+(HOME_PITCH-returnHome.fromPitch)*ease;
      if(fraction>=1){returnHome=null;yaw=0;pitch=HOME_PITCH;autoSpin=0;}
    }else if(!drag&&!natural){
      if(Math.abs(velocityX)+Math.abs(velocityY)>0.00008){
        yaw+=velocityX*(dt/16);
        pitch=clamp(pitch+velocityY*(dt/16),-1.47,1.47);
        const friction=Math.pow(0.92,dt/16);
        velocityX*=friction;velocityY*=friction;
      }else{velocityX=0;velocityY=0;}
      // A gentle idle motion that keeps the owner's location facing forward.
      // ±4° of longitude keeps the author location visible at all times.
      if(!hovered&&t-lastGesture>1200)autoSpin+=dt/390000;
    }
    const homeSway=(!drag&&!returnHome&&!hovered&&!natural)
      ?Math.sin(autoSpin*6.283185307)*0.011:0;
    gl.uniform1f(spinUniform,HOME_SPIN+yaw/6.283185307+homeSway);
    gl.uniform1f(pitchUniform,pitch);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(!canvas.classList.contains('is-ready'))canvas.classList.add('is-ready');
    if(!natural)raf=requestAnimationFrame(draw);
  }
  function schedule(){
    if(ready&&!lost&&!document.hidden&&visible&&!raf)raf=requestAnimationFrame(draw);
  }
  const images=['./assets/earth-day.jpg','./assets/earth-clouds.png'];
  Promise.all(images.map(src=>new Promise((resolve,reject)=>{
    const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=reject;img.src=new URL(src,document.baseURI).href;
  }))).then(bitmaps=>{
    if(lost)return;
    bitmaps.forEach((img,index)=>{
      gl.activeTexture(gl.TEXTURE0+index);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    });
    ready=true;schedule();
  }).catch(()=>{canvas.hidden=true;});
  const watch=new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    lastFrame=0;
    if(!visible&&raf){cancelAnimationFrame(raf);raf=0;}
    if(visible)schedule();
  },{rootMargin:'80px'});
  watch.observe(canvas);
  document.addEventListener('visibilitychange',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.classList.remove('is-ready');if(raf)cancelAnimationFrame(raf);});
  canvas.addEventListener('webglcontextrestored',()=>{canvas.hidden=true;}); // Keep the photograph if GPU state was lost.
})();

/* Canvas starfield: a subtle field of stars and reactive light */
(function initSpace(){const canvas=$('#space-canvas');if(!canvas)return;const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
  const rand=(i,s)=>{let x=Math.sin((i+1)*127.1+s*311.7)*43758.5453;return x-Math.floor(x);};
  const stars=Array.from({length:125},(_,i)=>({x:rand(i,1),y:rand(i,2),r:.4+rand(i,3)*1.3,phase:rand(i,4)*6.283,parallax:rand(i,5)*.6}));let w=0,h=0,pointerX=0,pointerY=0,currentX=0,currentY=0,frame=0,active=true,spaceFrame=0;
  function resize(){const b=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);w=b.width;h=b.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  resize();window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('pointermove',e=>{pointerX=(e.clientX/innerWidth-.5)*17;pointerY=(e.clientY/innerHeight-.5)*17;},{passive:true});
  const visibility=new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active&&!reducedMotion&&!spaceFrame)spaceFrame=requestAnimationFrame(render);});visibility.observe(canvas);
  function render(time){spaceFrame=0;if(!active)return;ctx.clearRect(0,0,w,h);currentX+=(pointerX-currentX)*.035;currentY+=(pointerY-currentY)*.035;
    stars.forEach(s=>{let x=s.x*w+currentX*s.parallax,y=s.y*h+currentY*s.parallax,opacity=.25+.55*(.5+.5*Math.sin(time*.0007+s.phase));ctx.beginPath();ctx.fillStyle=`rgba(225,214,255,${opacity})`;ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill();});
    const g=ctx.createRadialGradient(w*.52+currentX*.18,h*.5+currentY*.18,0,w*.52,h*.5,w*.49);g.addColorStop(0,'rgba(172,125,253,.068)');g.addColorStop(1,'rgba(172,125,253,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    frame++;if(!reducedMotion&&document.visibilityState==='visible'&&active)spaceFrame=requestAnimationFrame(render);
  }
  render(0);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active&&!reducedMotion&&!spaceFrame)spaceFrame=requestAnimationFrame(render);});
})();

/* Touch + keyboard utility: keep focus inside active dialog. */
document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const active=!modal.hidden?modal:!command.hidden?command:null;if(!active)return;
  const focusable=$$('button:not([disabled]),a[href]',active).filter(el=>el.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
