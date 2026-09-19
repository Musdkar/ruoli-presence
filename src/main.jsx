import React,{useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter,Link,NavLink,Navigate,Outlet,Route,Routes,useLocation,useParams} from "react-router-dom";
import {useLanyard} from "use-lanyard";
import {config} from "./config";
import {posts} from "./content/posts";
import {getDisplayPresence} from "./presence";
import {fetchLanyardPresence,readCachedPresence,sanitizePresence,writeCachedPresence} from "./lanyard-cache";
import {normalizeApps,normalizeHealth,normalizeKeyboard,resolveMusic} from "./normalize";
import "./styles.css";
import "./hotfix.css";
import "./theme.css";

const LazyMasonryPhotoAlbum=React.lazy(async()=>{
  await import("react-photo-album/masonry.css");
  const mod=await import("react-photo-album");
  return{default:mod.MasonryPhotoAlbum};
});
const LazyMarkdown=React.lazy(async()=>{
  const[{default:Markdown},{default:gfm}]=await Promise.all([
    import("react-markdown"),
    import("remark-gfm"),
  ]);
  return{default:function MarkdownRenderer({children}){return <Markdown remarkPlugins={[gfm]}>{children}</Markdown>}};
});

const CardHead=({title,meta})=><div className="card-head"><span>{title}</span>{meta?<small>{meta}</small>:null}</div>;
const Empty=({label,detail})=><div className="empty"><strong>{label}</strong><span>{detail}</span></div>;
const MAP_STYLE={dark:"https://tiles.openfreemap.org/styles/dark",light:"https://tiles.openfreemap.org/styles/positron"};
// Two physical layouts, kept separate per device. Nothing is merged: the Mac
// keyboard shows macOS key names (command/option/control) and the Windows 87-key
// TKL shows Windows names (win/alt/ctrl). Shared keys (letters, ESC, RETURN,
// SHIFT, BACKSPACE, TAB, CAPS, arrows) use the same logical name on both.
const KEYBOARD_MAC=[
  [
    {key:"ESC",label:"esc",u:1.15},
    {key:"1",label:"1"},{key:"2",label:"2"},{key:"3",label:"3"},{key:"4",label:"4"},{key:"5",label:"5"},{key:"6",label:"6"},{key:"7",label:"7"},{key:"8",label:"8"},{key:"9",label:"9"},{key:"0",label:"0"},{key:"-",label:"-"},{key:"=",label:"="},
    {key:"BACKSPACE",label:"delete",u:1.8},
  ],
  [
    {key:"TAB",label:"tab",u:1.45},
    {key:"Q",label:"Q"},{key:"W",label:"W"},{key:"E",label:"E"},{key:"R",label:"R"},{key:"T",label:"T"},{key:"Y",label:"Y"},{key:"U",label:"U"},{key:"I",label:"I"},{key:"O",label:"O"},{key:"P",label:"P"},{key:"[",label:"["},{key:"]",label:"]"},{key:"\\",label:"\\"},
  ],
  [
    {key:"CAPS",label:"caps",u:1.7},
    {key:"A",label:"A"},{key:"S",label:"S"},{key:"D",label:"D"},{key:"F",label:"F"},{key:"G",label:"G"},{key:"H",label:"H"},{key:"J",label:"J"},{key:"K",label:"K"},{key:"L",label:"L"},{key:";",label:";"},{key:"'",label:"'"},
    {key:"RETURN",label:"return",u:2.15},
  ],
  [
    {key:"SHIFT",label:"shift",u:2.35},
    {key:"Z",label:"Z"},{key:"X",label:"X"},{key:"C",label:"C"},{key:"V",label:"V"},{key:"B",label:"B"},{key:"N",label:"N"},{key:"M",label:"M"},{key:",",label:","},{key:".",label:"."},{key:"/",label:"/"},
    {key:"SHIFT",label:"shift",u:2.65},
  ],
  [
    {key:"CONTROL",label:"control",u:1.0},
    {key:"OPTION",label:"option",u:1.0},
    {key:"COMMAND",label:"command",u:1.25},
    {key:"SPACE",label:"",u:5},
    {key:"COMMAND",label:"command",u:1.25},
    {key:"OPTION",label:"option",u:1.0},
    {key:"LEFT",label:"\u2190",u:.8},
    {key:"DOWN",label:"\u2193",u:.8},
    {key:"UP",label:"\u2191",u:.8},
    {key:"RIGHT",label:"\u2192",u:.8},
  ],
];

// Windows 87-key TKL (no numpad): function row + standard ANSI body.
const KEYBOARD_WIN_87=[
  [
    {key:"ESC",label:"esc",u:1},
    {key:"F1",label:"F1"},{key:"F2",label:"F2"},{key:"F3",label:"F3"},{key:"F4",label:"F4"},
    {key:"F5",label:"F5"},{key:"F6",label:"F6"},{key:"F7",label:"F7"},{key:"F8",label:"F8"},
    {key:"F9",label:"F9"},{key:"F10",label:"F10"},{key:"F11",label:"F11"},{key:"F12",label:"F12"},
  ],
  [
    {key:"`",label:"`"},{key:"1",label:"1"},{key:"2",label:"2"},{key:"3",label:"3"},{key:"4",label:"4"},{key:"5",label:"5"},{key:"6",label:"6"},{key:"7",label:"7"},{key:"8",label:"8"},{key:"9",label:"9"},{key:"0",label:"0"},{key:"-",label:"-"},{key:"=",label:"="},
    {key:"BACKSPACE",label:"backspace",u:2},
  ],
  [
    {key:"TAB",label:"tab",u:1.5},
    {key:"Q",label:"Q"},{key:"W",label:"W"},{key:"E",label:"E"},{key:"R",label:"R"},{key:"T",label:"T"},{key:"Y",label:"Y"},{key:"U",label:"U"},{key:"I",label:"I"},{key:"O",label:"O"},{key:"P",label:"P"},{key:"[",label:"["},{key:"]",label:"]"},{key:"\\",label:"\\",u:1.5},
  ],
  [
    {key:"CAPS",label:"caps",u:1.75},
    {key:"A",label:"A"},{key:"S",label:"S"},{key:"D",label:"D"},{key:"F",label:"F"},{key:"G",label:"G"},{key:"H",label:"H"},{key:"J",label:"J"},{key:"K",label:"K"},{key:"L",label:"L"},{key:";",label:";"},{key:"'",label:"'"},
    {key:"RETURN",label:"enter",u:2.25},
  ],
  [
    {key:"SHIFT",label:"shift",u:2.25},
    {key:"Z",label:"Z"},{key:"X",label:"X"},{key:"C",label:"C"},{key:"V",label:"V"},{key:"B",label:"B"},{key:"N",label:"N"},{key:"M",label:"M"},{key:",",label:","},{key:".",label:"."},{key:"/",label:"/"},
    {key:"SHIFT",label:"shift",u:2.75},
  ],
  [
    {key:"CTRL",label:"ctrl",u:1.25},
    {key:"WIN",label:"win",u:1.25},
    {key:"ALT",label:"alt",u:1.25},
    {key:"SPACE",label:"",u:6.25},
    {key:"ALT",label:"alt",u:1.25},
    {key:"WIN",label:"win",u:1.25},
    {key:"MENU",label:"menu",u:1.25},
    {key:"CTRL",label:"ctrl",u:1.25},
    {key:"LEFT",label:"\u2190",u:.85},
    {key:"DOWN",label:"\u2193",u:.85},
    {key:"UP",label:"\u2191",u:.85},
    {key:"RIGHT",label:"\u2192",u:.85},
  ],
];

const THEME_KEY="theme";
const THEME_MODES=["dark","light","system"];
const themeIcon=mode=>mode==="light"?"☀":mode==="dark"?"☾":"◐";
function applyThemeMode(mode){
  const prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved=mode==="system"?(prefersDark?"dark":"light"):mode;
  const el=document.documentElement;
  el.classList.remove("light","dark");
  el.classList.add(resolved);
  el.style.colorScheme=resolved;
}
function useTheme(){
  const[stored,setStored]=useState(()=>{try{return localStorage.getItem(THEME_KEY)||"system"}catch{return "system"}});
  useEffect(()=>{
    applyThemeMode(stored);
    try{localStorage.setItem(THEME_KEY,stored)}catch{}
    if(stored!=="system")return;
    const mq=window.matchMedia("(prefers-color-scheme: dark)");
    const onChange=()=>applyThemeMode("system");
    mq.addEventListener("change",onChange);
    return()=>mq.removeEventListener("change",onChange);
  },[stored]);
  const cycle=()=>setStored(cur=>THEME_MODES[(THEME_MODES.indexOf(cur)+1)%THEME_MODES.length]);
  return{stored,cycle};
}

function useFastLanyard(userId){
  const live=useLanyard(userId);
  const liveRef=useRef(live);
  liveRef.current=live;
  const[cached,setCached]=useState(()=>readCachedPresence(userId));

  useEffect(()=>{
    if(!userId)return;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),2500);
    fetchLanyardPresence(userId,{signal:controller.signal}).then((next)=>{
      if(!next||liveRef.current)return;
      setCached(next);
      writeCachedPresence(userId,next);
    }).catch(()=>{}).finally(()=>clearTimeout(timeout));
    return()=>{
      clearTimeout(timeout);
      controller.abort();
    };
  },[userId]);

  useEffect(()=>{
    const next=sanitizePresence(live);
    if(!next)return;
    setCached(next);
    writeCachedPresence(userId,next);
  },[live,userId]);

  return live||cached;
}

function ThemeToggle(){
  const{stored,cycle}=useTheme();
  const next=THEME_MODES[(THEME_MODES.indexOf(stored)+1)%THEME_MODES.length];
  return <button type="button" className="theme-toggle" onClick={cycle} title={`Theme: ${stored} — switch to ${next}`} aria-label={`Theme: ${stored}. Switch to ${next}`}><span className="theme-toggle-icon" aria-hidden="true">{themeIcon(stored)}</span><span className="theme-toggle-label">{stored}</span></button>;
}

function useResolvedTheme(){
  const read=()=>document.documentElement.classList.contains("light")?"light":"dark";
  const[resolved,setResolved]=useState(read);
  useEffect(()=>{
    const el=document.documentElement;
    const obs=new MutationObserver(()=>setResolved(read()));
    obs.observe(el,{attributes:true,attributeFilter:["class"]});
    setResolved(read());
    return()=>obs.disconnect();
  },[]);
  return resolved;
}
function MapCard({active}){
  const ref=useRef(null);
  const resolvedTheme=useResolvedTheme();
  const mapRef=useRef(null);
  const[failed,setFailed]=useState(false);
  const[ready,setReady]=useState(false);
  const[shouldLoad,setShouldLoad]=useState(false);

  useEffect(()=>{
    if(!active||shouldLoad||!ref.current)return;
    const node=ref.current;
    if(!("IntersectionObserver" in window)){
      setShouldLoad(true);
      return;
    }
    let idleId=null;
    let timerId=null;
    const scheduleLoad=()=>{
      if("requestIdleCallback" in window){
        idleId=window.requestIdleCallback(()=>setShouldLoad(true),{timeout:1500});
      }else{
        timerId=window.setTimeout(()=>setShouldLoad(true),500);
      }
    };
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry?.isIntersecting)return;
      observer.disconnect();
      scheduleLoad();
    },{root:null,rootMargin:"160px 0px"});
    observer.observe(node);
    return()=>{
      observer.disconnect();
      if(idleId!=null&&"cancelIdleCallback" in window)window.cancelIdleCallback(idleId);
      if(timerId!=null)window.clearTimeout(timerId);
    };
  },[active,shouldLoad]);

  useEffect(()=>{
    if(!shouldLoad||!ref.current)return;
    let disposed=false;
    let map;
    const init=async()=>{
      try{
        const[{default:maplibregl}]=await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if(disposed||!ref.current)return;
        const theme=document.documentElement.classList.contains("light")?"light":"dark";
        map=new maplibregl.Map({container:ref.current,style:MAP_STYLE[theme],center:[config.lng,config.lat],zoom:8.4,attributionControl:false,interactive:false});
        mapRef.current=map;
        map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
        map.on("error",()=>{});
        map.once("load",()=>{if(!disposed)setReady(true)});
      }catch(error){
        if(disposed)return;
        console.error("Map failed to initialise",error);
        setFailed(true);
      }
    };
    init();
    return()=>{
      disposed=true;
      mapRef.current=null;
      try{map?.remove()}catch{}
    };
  },[shouldLoad]);

  useEffect(()=>{
    const map=mapRef.current;
    if(map===null)return;
    try{map.setStyle(MAP_STYLE[resolvedTheme])}
    catch(error){console.error("Map style switch failed",error)}
  },[resolvedTheme]);

  useEffect(()=>{
    if(!active)return;
    const frame=requestAnimationFrame(()=>mapRef.current?.resize());
    return()=>cancelAnimationFrame(frame);
  },[active]);

  return <article className="card map-card" aria-busy={shouldLoad&&!ready&&!failed}><div ref={ref} className={`map-canvas${ready?" is-ready":""}`}/><div className="map-shade"/><h2>{config.city}</h2><div className="map-avatar"><img src={config.mapAvatar} alt="Map avatar" width="66" height="66" loading="lazy" decoding="async"/></div>{shouldLoad&&!ready&&<span className="map-loading" role="status">{failed?"Map unavailable":"Loading map…"}</span>}<div className="map-pill">◎ {config.city}, {config.region}</div></article>;
}
const WEATHER_CACHE_KEY="ruoli:weather:v1";
const WEATHER_CACHE_MAX_AGE=30*60*1000;
function readWeatherCache(){
  try{
    const parsed=JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)||"null");
    if(!parsed||!Number.isFinite(parsed.savedAt)||Date.now()-parsed.savedAt>WEATHER_CACHE_MAX_AGE)return null;
    return parsed.weather&&typeof parsed.weather==="object"?parsed.weather:null;
  }catch{return null}
}
function WeatherCard(){
  const[weather,setWeather]=useState(readWeatherCache);
  useEffect(()=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),3000);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${config.weatherLat}&longitude=${config.weatherLng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=${encodeURIComponent(config.timezone)}`,{signal:controller.signal})
      .then((r)=>{if(!r.ok)throw new Error("weather "+r.status);return r.json()})
      .then((data)=>{
        const next=data.current||null;
        if(!next)throw new Error("weather missing current");
        setWeather(next);
        try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({savedAt:Date.now(),weather:next}))}catch{}
      })
      .catch(()=>setWeather((current)=>current||false))
      .finally(()=>clearTimeout(timeout));
    return()=>{
      clearTimeout(timeout);
      controller.abort();
    };
  },[]);
  const names={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",51:"Drizzle",61:"Rain",63:"Rain",65:"Heavy rain",80:"Showers",95:"Thunderstorm"};
  return <article className="card weather-card"><CardHead title="Weather · Wuhan"/><div className="weather-main"><div><strong>{weather&&weather.temperature_2m!=null?Math.round(weather.temperature_2m)+"°":"--°"}</strong><span>{weather?(names[weather.weather_code]||"Current weather"):weather===false?"unavailable":"loading…"}</span></div>{weather&&<small>feels {Math.round(weather.apparent_temperature)}°<br/>wind {Math.round(weather.wind_speed_10m)} km/h</small>}</div></article>;
}
function formatUsageMinutes(minutes){
  const seconds=Math.max(0,Math.round(Number(minutes||0)*60));
  if(seconds<60)return seconds+"s";
  const hours=Math.floor(seconds/3600);
  const mins=Math.floor((seconds%3600)/60);
  const secs=seconds%60;
  if(hours>0)return hours+"h "+String(mins).padStart(2,"0")+"m";
  if(mins<10&&secs>0)return mins+"m "+String(secs).padStart(2,"0")+"s";
  return mins+"m";
}

function SoftwareCard({apps}){
  if(!apps?.length)return <article className="card apps-card"><CardHead title="Software / today" meta="foreground"/><Empty label="Software aggregate not linked" detail="Run bridge/whatpulse_presence.py to publish today’s foreground application time."/></article>;
  const top=apps.slice(0,8);
  const max=Math.max(1,...top.map(app=>app.minutes));
  return <article className="card apps-card"><CardHead title="Software / today" meta="foreground"/><div className="software-usage-list">{top.map((app,index)=><div className="software-usage-row" key={app.name}><div className="software-usage-name"><span>{String(index+1).padStart(2,"0")}</span><strong title={app.name}>{app.name}</strong></div><div className="software-usage-track" aria-hidden="true"><i style={{width:`${Math.max(4,app.minutes/max*100)}%`}}/></div><time>{formatUsageMinutes(app.minutes)}</time></div>)}</div></article>;
}

function KeyboardCard({keyboard,layout,title,note,device}){
  if(!keyboard){
    return <article className={"card keyboard-card keyboard-card--"+(device||"mac")}><CardHead title={title||"Keyboard / today"}/><Empty label="Keyboard aggregate not linked" detail={note||"Publish a privacy-filtered keyboard aggregate for this device; no live keystrokes or key order leave the computer."}/></article>;
  }
  return <article className={"card keyboard-card keyboard-card--"+(device||"mac")}><CardHead title={title||"Keyboard / today"} meta={keyboard.total.toLocaleString()+" keys"}/><div className="keyboard-heatmap" style={{"--kb-rows":layout.length}} aria-label={(title||"Keyboard")+" heatmap for "+keyboard.date}>{layout.map((row,rowIndex)=><div className="keyboard-row" key={rowIndex}>{row.map((item,index)=>{const level=keyboard.heat[item.key]||0;return <div className="keyboard-key" key={rowIndex+"-"+index} style={{'--key-u':item.u||1,'--heat':level/15}} title={item.label||"space"}><span>{item.label}</span></div>})}</div>)}</div></article>;
}

function HomePhotoCard(){
  const photo=config.photos[0];
  return <article className="card photos-card"><CardHead title="Photo" meta="latest frame"/>{photo?<div className="photo-album"><img className="photo-backdrop" src={photo.src} alt="" aria-hidden="true"/><img className="photo-preview" src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async"/></div>:<Empty label="No photos yet"/>}<Link className="photo-open" to="/photo">open archive ↗</Link></article>;
}

function FitnessCard({health}){
  const steps=Math.max(0,Number(health?.steps||0));
  const goal=Math.max(1,Number(config.fitness?.stepGoal||8000));
  const progress=Math.min(1,steps/goal);
  const radius=46;
  const circumference=2*Math.PI*radius;
  const offset=circumference*(1-progress);
  const synced=health!=null;
  return <article className="card fitness-card"><CardHead title="Fitness" meta={synced?"steps · today":"not synced"}/><div className={`fitness-content${synced?"":" is-empty"}`}><div className="fitness-ring-wrap" role="img" aria-label={`${steps.toLocaleString()} of ${goal.toLocaleString()} steps`}><svg className="fitness-ring" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="fitness-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--violet)"/><stop offset="100%" stopColor="var(--mint)"/></linearGradient></defs><circle className="fitness-ring-track" cx="60" cy="60" r={radius}/><circle className="fitness-ring-progress" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} style={{opacity:progress>0?1:0}}/></svg></div><div className="fitness-steps"><span className="fitness-footsteps" aria-hidden="true"><i/><i/><b/><b/></span><strong>{synced?steps.toLocaleString():"--"}</strong></div></div></article>;
}

function DevicesCard(){return <article className="card devices-card"><CardHead title="Devices" meta="daily / play"/><div className="device-columns"><DeviceGroup title="daily" items={[["MacBook Pro · M1 Pro","macOS"],["iPhone 16 Pro Max","mobile"],["AirPods Pro 3","audio"]]}/><DeviceGroup title="play" items={[["Quest 3","VR"],["Gaming Laptop","7945HX · RTX 5070 Ti"],["Desktop PC","5800X · RX 6900 XT"],["Xiaomi Pad 7S Pro","tablet"]]}/></div></article>}
function DeviceGroup({title,items}){return <div><h4>{title}</h4>{items.map(([n,m])=><div className="device" key={n}><b>{n}</b><span>{m}</span></div>)}</div>}

function StatusCard({displayPresence}){const{status,label}=displayPresence;return <article className="card status-card"><CardHead title="Status"/><div className="status-main"><span className={`status-dot ${status}`}/><strong>{label}</strong></div></article>}
function MusicCard({music}){
  const stateLabels={playing:"Now playing",paused:"Paused",last_played:"Last played"};
  const serviceLabels={netease:"NetEase Music",apple_music:"Apple Music",spotify:"Spotify"};
  const serviceLabel=music&&music.service?serviceLabels[music.service]||null:null;
  const coverUrl=music?.artwork?.url||null;
  const[failedCover,setFailedCover]=useState(null);
  if(!music||music.state==="never")return <article className="card music-card"><CardHead title="Music Status" meta={serviceLabel}/><Empty label="Music not linked yet" detail="Waiting for the first local sync"/></article>;
  const showCover=coverUrl&&failedCover!==coverUrl;
  return <article className="card music-card"><CardHead title="Music Status" meta={serviceLabel}/><div className={`music-body music-${music.state}`}><div className="music-state">{stateLabels[music.state]||"Music"}</div><div className="music-cover-frame">{showCover?<img className="music-cover" src={coverUrl} alt={music.track.title+" cover"} loading="lazy" decoding="async" onError={()=>setFailedCover(coverUrl)}/>:<div className="music-cover music-cover-empty">&#9834;</div>}</div><div className="music-track"><strong>{music.track.title}</strong><span>{music.track.artist}</span></div></div></article>;
}
function VrcStatus({presence}){const vrc=presence?.activities?.find(a=>/vrchat/i.test(a.name||'')||/vrchat/i.test(a.details||''));return vrc?<div className="vrc-line">VRChat · {vrc.details||vrc.state||"active"}</div>:null}

function Sidebar({presence,displayPresence}){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t)},[]);
  const local=useMemo(()=>new Intl.DateTimeFormat('en-GB',{timeZone:config.timezone,hour:'2-digit',minute:'2-digit',hour12:false}).format(now),[now]);
  return <aside><div className="sidebar"><div className="sidebar-top"><div className="kicker">About me</div><span className="sidebar-motto">mostly<br/><i>online.</i></span></div><div className="identity"><img className="avatar" src={config.avatar} alt="avatar" width="78" height="78" fetchPriority="high" decoding="async"/><div><h1>{config.name}<br/><i>{config.nameJa}</i></h1><p>{config.greeting} I&apos;m {config.name}. {config.about}</p></div></div><div className="rule"/><div className="fun-facts"><div className="fun-facts-title">Fun facts</div><ul>{config.funFacts.map(fact=><li key={fact}>{fact}</li>)}</ul></div><dl><div><dt>local time</dt><dd>{local}</dd></div><div><dt>presence</dt><dd className={`sidebar-presence ${displayPresence.status}`}>● {displayPresence.label}</dd></div></dl><VrcStatus presence={presence}/><div className="social-block"><div className="social-title">Connect</div><div className="socials">{config.socialLinks.map(link=>link.href?<a key={link.label} href={link.href} target="_blank" rel="noreferrer" title={link.name}>{link.label}</a>:<span key={link.label} className="disabled" title={`${link.name} not linked`}>{link.label}</span>)}</div></div><div className="sidebar-note"><b>One identity, four views.</b><br/>Home is the live surface; Blog, Photo and Uses reuse the same fixed identity rail.</div></div></aside>;
}

function Layout({presence}){
  const{pathname}=useLocation();
  const isHome=pathname==="/";
  const[hasVisitedHome,setHasVisitedHome]=useState(isHome);
  const[now,setNow]=useState(Date.now);
  useEffect(()=>{if(isHome)setHasVisitedHome(true)},[isHome]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[]);
  const displayPresence=getDisplayPresence(presence,now);
  return <><header><Link className="brand" to="/">RUOLI<b>.</b></Link><nav>{[["/","HOME"],["/blog","BLOG"],["/photo","PHOTO"],["/uses","USES"]].map(([to,label])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>isActive?"active":""}>{label}</NavLink>)}</nav><ThemeToggle/><div className="edition">digital presence<br/>2026 edition</div></header><main><Sidebar presence={presence} displayPresence={displayPresence}/><section className="content">{(isHome||hasVisitedHome)&&<Home presence={presence} displayPresence={displayPresence} active={isHome} now={now}/>}<Outlet/></section></main></>;
}

function Home({presence,displayPresence,active,now}){
  const kv=presence&&presence.kv?presence.kv:{};
  // Software usage combines every device so the list can show more rows.
  const apps=(function(){const byName=new Map();for(const a of normalizeApps(kv.apps_today_mac||kv.apps_today).concat(normalizeApps(kv.apps_today_win))){const cur=byName.get(a.name)||0;byName.set(a.name,cur+a.minutes);}return Array.from(byName,(entry)=>({name:entry[0],minutes:Math.round(entry[1]*10)/10})).sort((a,b)=>b.minutes-a.minutes);})();
  const health=normalizeHealth(kv.health_today);
  // Keyboards are per device and never merged.
  const keyboardMac=normalizeKeyboard(kv.keyboard_today_mac||kv.keyboard_today||kv.keyboard_yesterday);
  const keyboardWin=normalizeKeyboard(kv.keyboard_today_win);
  const music=resolveMusic(kv.music_now,presence&&presence.spotify,now);
  return <div className="view home-view" hidden={!active}><div className="grid"><StatusCard displayPresence={displayPresence}/><WeatherCard/><MapCard active={active}/><MusicCard music={music}/><HomePhotoCard/><FitnessCard health={health}/><DevicesCard/><SoftwareCard apps={apps}/><KeyboardCard keyboard={keyboardMac} layout={KEYBOARD_MAC} device="mac" title="Keyboard · Mac" note="Run bridge/whatpulse_presence.py on the Mac to publish a privacy-filtered keyboard aggregate."/><KeyboardCard keyboard={keyboardWin} layout={KEYBOARD_WIN_87} device="win" title="Keyboard · Windows" note="Run the Windows bridge (DEVICE=win) to publish a privacy-filtered keyboard aggregate."/></div></div>;
}

function PhotoPage(){
  return <div className="view page-view photo-page"><div className="page-mast"><div><span className="eyebrow">PHOTO / ARCHIVE</span><h2>Places, moments,<br/>and fragments.</h2></div><p>A visual archive. Mixed portrait and landscape images are laid out by React Photo Album rather than forced into one crop ratio.</p></div><div className="page-rule"/><div className="photo-wall"><React.Suspense fallback={<div className="archive-note">Loading archive…</div>}><LazyMasonryPhotoAlbum photos={config.photos} columns={width=>width<700?1:width<1200?2:3} spacing={10}/></React.Suspense></div>{config.photos.length===1&&<div className="archive-note">One image in the archive for now. Add more files later and the layout will rebalance automatically.</div>}</div>;
}

const publishedPosts=posts.filter(post=>post.published!==false);
function BlogPage(){
  return <div className="view page-view blog-page"><div className="page-mast"><div><span className="eyebrow">BLOG / NOTES</span><h2>Things worth<br/>writing down.</h2></div><p>Longer notes on software, security, VR, experiments and whatever is occupying my attention.</p></div><div className="page-rule"/>{publishedPosts.length?<div className="post-list">{publishedPosts.map((post,index)=><Link className="post-row" to={`/blog/${post.slug}`} key={post.slug}><span className="post-index">{String(index+1).padStart(2,"0")}</span><div><h3>{post.title}</h3><p>{post.summary}</p><div className="post-tags">{post.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div><time>{post.date}</time></Link>)}</div>:<div className="blog-empty"><span>ISSUE 00</span><h3>No published posts yet.</h3><p>The blog structure is live and Markdown-ready. Drafts stay invisible until they are marked published.</p></div>}</div>;
}

function BlogPost(){
  const{slug}=useParams();
  const post=posts.find(item=>item.slug===slug&&item.published!==false);
  if(!post)return <div className="view page-view"><div className="blog-empty"><span>404</span><h3>Post not found.</h3><Link to="/blog">← back to blog</Link></div></div>;
  return <article className="view article-view"><Link className="back-link" to="/blog">← BLOG</Link><header className="article-head"><time>{post.date}</time><h2>{post.title}</h2><p>{post.summary}</p></header><div className="article-body"><React.Suspense fallback={<p>Loading article…</p>}><LazyMarkdown>{post.body}</LazyMarkdown></React.Suspense></div></article>;
}

function BrandMark({item}){
  if(item.icon)return <img src={`/assets/software-icons/${item.icon}`} alt="" width="18" height="18" loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.display="none";e.currentTarget.nextElementSibling?.classList.add("show")}}/>;
  return <span className="brand-fallback show">{item.monogram||item.name.slice(0,2).toUpperCase()}</span>;
}

function UsesPage(){
  return <div className="view page-view uses-page"><div className="page-mast"><div><span className="eyebrow">USES / SOFTWARE</span><h2>The tools behind<br/>my screen time.</h2></div><p>A personal software shelf, not a recommendation list. The live “today” percentages stay on Home; this page is the slower, more permanent inventory.</p></div><div className="page-rule"/><div className="uses-grid">{config.software.map(group=><section className="uses-group" key={group.group}><div className="uses-group-head"><h3>{group.group}</h3><span>{group.note}</span></div><div className="software-list">{group.items.map(item=><div className="software-item" key={item.name}><div className="software-icon"><BrandMark item={item}/>{item.icon&&<span className="brand-fallback">{item.monogram||item.name.slice(0,2).toUpperCase()}</span>}</div><div><b>{item.name}</b><span>{item.meta}</span></div></div>)}</div></section>)}</div><div className="uses-foot"><span>Hardware stays on Home for now.</span><span>Software icons · self-hosted</span></div></div>;
}

function SiteRouter({presence}){
  return <BrowserRouter><Routes><Route element={<Layout presence={presence}/>}><Route index element={null}/><Route path="photo" element={<PhotoPage/>}/><Route path="photos" element={<Navigate to="/photo" replace/>}/><Route path="blog" element={<BlogPage/>}/><Route path="blog/:slug" element={<BlogPost/>}/><Route path="uses" element={<UsesPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></BrowserRouter>;
}
function LanyardApp(){const presence=useFastLanyard(config.discordId);return <SiteRouter presence={presence}/>}
function App(){return config.discordId?<LanyardApp/>:<SiteRouter presence={null}/>}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
