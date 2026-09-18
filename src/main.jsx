import React,{useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter,Link,NavLink,Navigate,Outlet,Route,Routes,useLocation,useParams} from "react-router-dom";
import {useLanyard} from "use-lanyard";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {MasonryPhotoAlbum} from "react-photo-album";
import "react-photo-album/masonry.css";
import {Doughnut} from "react-chartjs-2";
import {ArcElement,Chart as ChartJS,Tooltip} from "chart.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {config} from "./config";
import {posts} from "./content/posts";
import {getDisplayPresence} from "./presence";
import {normalizeApps,normalizeHealth,resolveMusic} from "./normalize";
import "./styles.css";
import "./hotfix.css";
import "./theme.css";

ChartJS.register(ArcElement,Tooltip);
const CardHead=({title,meta})=><div className="card-head"><span>{title}</span><small>{meta}</small></div>;
const Empty=({label,detail})=><div className="empty"><strong>{label}</strong><span>{detail}</span></div>;
const MAP_STYLE={dark:"https://tiles.openfreemap.org/styles/dark",light:"https://tiles.openfreemap.org/styles/positron"};

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
function ThemeToggle(){
  const{stored,cycle}=useTheme();
  const next=THEME_MODES[(THEME_MODES.indexOf(stored)+1)%THEME_MODES.length];
  return <button type="button" className="theme-toggle" onClick={cycle} title={`Theme: ${stored} — switch to ${next}`} aria-label={`Theme: ${stored}. Switch to ${next}`}><span className="theme-toggle-icon" aria-hidden="true">{themeIcon(stored)}</span><span className="theme-toggle-label">{stored}</span></button>;
}

function MapCard({active}){
  const ref=useRef(null);
  const resolvedTheme=useResolvedTheme();
  const mapRef=useRef(null);
  const[failed,setFailed]=useState(false);
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;
    let map;
    try{
      map=new maplibregl.Map({container:ref.current,style:MAP_STYLE[resolvedTheme],center:[config.lng,config.lat],zoom:8.4,attributionControl:false,interactive:false});
      mapRef.current=map;
      map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
      map.on("error",()=>{});
      map.once("load",()=>setReady(true));
    }catch(error){
      console.error("Map failed to initialise",error);
      setFailed(true);
    }
    return()=>{mapRef.current=null;try{map?.remove()}catch{}};
  },[]);
  useEffect(()=>{
    const map=mapRef.current;
    if (map === null) return;
    try { map.setStyle(MAP_STYLE[resolvedTheme]); }
    catch (error) { console.error("Map style switch failed", error); }
  }, [resolvedTheme]);
  useEffect(()=>{
    if(!active)return;
    const frame=requestAnimationFrame(()=>mapRef.current?.resize());
    return()=>cancelAnimationFrame(frame);
  },[active]);
  return <article className="card map-card" aria-busy={!ready&&!failed}><div ref={ref} className={`map-canvas${ready?" is-ready":""}`}/><div className="map-shade"/><h2>{config.city}</h2>{/* This non-interactive map is always centered on Wuhan, so its city marker can render before WebGL/tiles load. */}<div className="map-avatar"><img src={config.mapAvatar} alt="Map avatar" width="66" height="66" fetchPriority="high"/></div>{!ready&&<span className="map-loading" role="status">{failed?"Map unavailable":"Loading map…"}</span>}<div className="map-pill">◎ {config.city}, {config.region}</div></article>;
}

function WeatherCard(){
  const[weather,setWeather]=useState(null);
  useEffect(()=>{fetch(`https://api.open-meteo.com/v1/forecast?latitude=${config.weatherLat}&longitude=${config.weatherLng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=${encodeURIComponent(config.timezone)}`).then(r=>r.json()).then(d=>setWeather(d.current||null)).catch(()=>setWeather(false))},[]);
  const names={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",51:"Drizzle",61:"Rain",63:"Rain",65:"Heavy rain",80:"Showers",95:"Thunderstorm"};
  return <article className="card weather-card"><CardHead title="Weather · Wuhan" meta="Open-Meteo"/><div className="weather-main"><div><strong>{weather&&weather.temperature_2m!=null?Math.round(weather.temperature_2m)+"°":"--°"}</strong><span>{weather?(names[weather.weather_code]||"Current weather"):weather===false?"unavailable":"loading…"}</span></div>{weather&&<small>feels {Math.round(weather.apparent_temperature)}°<br/>wind {Math.round(weather.wind_speed_10m)} km/h</small>}</div></article>;
}

function SoftwareCard({apps}){
  if(!apps?.length)return <article className="card apps-card"><CardHead title="Software / today" meta="ActivityWatch"/><Empty label="ActivityWatch not linked" detail="Run bridge/activitywatch_bridge.py"/></article>;
  const top=apps.slice(0,5),total=top.reduce((s,a)=>s+a.minutes,0)||1,colors=["#8e7cff","#70a7ff","#ed7997","#6fc9b3","#50545e"],data={labels:top.map(a=>a.name),datasets:[{data:top.map(a=>a.minutes),backgroundColor:colors,borderWidth:0}]};
  return <article className="card apps-card"><CardHead title="Software / today" meta="ActivityWatch"/><div className="apps-body"><div className="chart-wrap"><Doughnut data={data} options={{cutout:"72%",plugins:{legend:{display:false},tooltip:{enabled:true}},animation:false}}/></div><div className="usage-list">{top.map((a,i)=><div className="usage-row" key={a.name}><span>{a.name}</span><i><b style={{width:`${a.minutes/total*100}%`,background:colors[i]}}/></i><strong>{Math.round(a.minutes/total*100)}%</strong></div>)}</div></div></article>;
}

function KeyboardCard(){
  return <article className="card keyboard-card"><CardHead title="Keyboard / yesterday" meta="WhatPulse · daily aggregate"/>{config.whatPulseHeatmapUrl?<a className="heatmap-link" href={config.whatPulseProfileUrl||config.whatPulseHeatmapUrl} target="_blank" rel="noreferrer"><img src={config.whatPulseHeatmapUrl} alt="Yesterday keyboard heatmap"/></a>:<Empty label="Daily keyboard aggregate not linked" detail="Only the previous day’s privacy-filtered aggregate will be published here; no live keystroke feed."/>}</article>;
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
  return <article className="card fitness-card"><CardHead title="Fitness" meta={synced?"steps · today":"not synced"}/><div className={`fitness-content${synced?"":" is-empty"}`}><div className="fitness-ring-wrap" role="img" aria-label={`${steps.toLocaleString()} of ${goal.toLocaleString()} steps`}><svg className="fitness-ring" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="fitness-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--violet)"/><stop offset="100%" stopColor="var(--mint)"/></linearGradient></defs><circle className="fitness-ring-track" cx="60" cy="60" r={radius}/><circle className="fitness-ring-progress" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} style={{opacity:progress>0?1:0}}/></svg></div><div className="fitness-steps"><span className="fitness-footsteps" aria-hidden="true"><i/><i/><b/><b/></span><strong>{steps.toLocaleString()}</strong><small>{synced?"steps":"waiting for sync"}</small></div></div></article>;
}

function DevicesCard(){return <article className="card devices-card"><CardHead title="Devices" meta="daily / play"/><div className="device-columns"><DeviceGroup title="daily" items={[["MacBook Pro · M1 Pro","macOS"],["iPhone 16 Pro Max","mobile"],["AirPods Pro 3","audio"]]}/><DeviceGroup title="play" items={[["Quest 3","VR"],["Gaming Laptop","7945HX · RTX 5070 Ti"],["Desktop PC","5800X · RX 6900 XT"],["Xiaomi Pad 7S Pro","tablet"]]}/></div></article>}
function DeviceGroup({title,items}){return <div><h4>{title}</h4>{items.map(([n,m])=><div className="device" key={n}><b>{n}</b><span>{m}</span></div>)}</div>}

function StatusCard({displayPresence}){const{status,label,source,detail}=displayPresence;return <article className="card status-card"><CardHead title="Status" meta={source}/><div className="status-main"><span className={`status-dot ${status}`}/><strong>{label}</strong><small>{detail}</small></div></article>}
function MusicCard({music}){
  const labels={netease:"NetEase Music",apple_music:"Apple Music",spotify:"Spotify"};
  const stateLabels={playing:"Now playing",paused:"Paused",last_played:"Last played"};
  const coverUrl=music?.artwork?.url||null;
  const[failedCover,setFailedCover]=useState(null);
  if(!music||music.state==="never")return <article className="card music-card"><CardHead title="Music" meta="Apple Music / NetEase"/><Empty label="Music not linked yet" detail="Waiting for the first local sync"/></article>;
  const service=labels[music.service]||"Music";
  const showCover=coverUrl&&failedCover!==coverUrl;
  return <article className="card music-card"><CardHead title="Music" meta={service}/><div className={`music-body music-${music.state}`}><div className="music-state">{stateLabels[music.state]||"Music"}</div><div className="music-cover-frame">{showCover?<img className="music-cover" src={coverUrl} alt={music.track.title+" cover"} loading="lazy" decoding="async" onError={()=>setFailedCover(coverUrl)}/>:<div className="music-cover music-cover-empty">&#9834;</div>}</div><div className="music-track"><strong>{music.track.title}</strong><span>{music.track.artist}</span></div></div></article>;
}
function VrcStatus({presence}){const vrc=presence?.activities?.find(a=>/vrchat/i.test(a.name||'')||/vrchat/i.test(a.details||''));return vrc?<div className="vrc-line">VRChat · {vrc.details||vrc.state||"active"}</div>:null}

function Sidebar({presence,displayPresence}){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t)},[]);
  const local=useMemo(()=>new Intl.DateTimeFormat('en-GB',{timeZone:config.timezone,hour:'2-digit',minute:'2-digit',hour12:false}).format(now),[now]);
  return <aside><div className="sidebar"><div className="sidebar-top"><div className="kicker">About me</div><span className="sidebar-motto">mostly<br/><i>online.</i></span></div><div className="identity"><img className="avatar" src={config.avatar} alt="avatar"/><div><h1>{config.name}<br/><i>{config.nameJa}</i></h1><p>{config.greeting} I&apos;m {config.name}. {config.about}</p></div></div><div className="rule"/><div className="fun-facts"><div className="fun-facts-title">Fun facts</div><ul>{config.funFacts.map(fact=><li key={fact}>{fact}</li>)}</ul></div><dl><div><dt>local time</dt><dd>{local}</dd></div><div><dt>presence</dt><dd className={`sidebar-presence ${displayPresence.status}`}>● {displayPresence.label}</dd></div></dl><VrcStatus presence={presence}/><div className="social-block"><div className="social-title">Connect</div><div className="socials">{config.socialLinks.map(link=>link.href?<a key={link.label} href={link.href} target="_blank" rel="noreferrer" title={link.name}>{link.label}</a>:<span key={link.label} className="disabled" title={`${link.name} not linked`}>{link.label}</span>)}</div></div><div className="sidebar-note"><b>One identity, four views.</b><br/>Home is the live surface; Blog, Photo and Uses reuse the same fixed identity rail.</div></div></aside>;
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
  const apps=normalizeApps(presence&&presence.kv&&presence.kv.apps_today);
  const health=normalizeHealth(presence&&presence.kv&&presence.kv.health_today);
  const music=resolveMusic(presence&&presence.kv&&presence.kv.music_now,presence&&presence.spotify,now);
  return <div className="view home-view" hidden={!active}><div className="grid"><StatusCard displayPresence={displayPresence}/><WeatherCard/><MapCard active={active}/><MusicCard music={music}/><HomePhotoCard/><FitnessCard health={health}/><DevicesCard/><SoftwareCard apps={apps}/><KeyboardCard/></div></div>;
}

function PhotoPage(){
  return <div className="view page-view photo-page"><div className="page-mast"><div><span className="eyebrow">PHOTO / ARCHIVE</span><h2>Places, moments,<br/>and fragments.</h2></div><p>A visual archive. Mixed portrait and landscape images are laid out by React Photo Album rather than forced into one crop ratio.</p></div><div className="page-rule"/><div className="photo-wall"><MasonryPhotoAlbum photos={config.photos} columns={width=>width<700?1:width<1200?2:3} spacing={10}/></div>{config.photos.length===1&&<div className="archive-note">One image in the archive for now. Add more files later and the layout will rebalance automatically.</div>}</div>;
}

const publishedPosts=posts.filter(post=>post.published!==false);
function BlogPage(){
  return <div className="view page-view blog-page"><div className="page-mast"><div><span className="eyebrow">BLOG / NOTES</span><h2>Things worth<br/>writing down.</h2></div><p>Longer notes on software, security, VR, experiments and whatever is occupying my attention.</p></div><div className="page-rule"/>{publishedPosts.length?<div className="post-list">{publishedPosts.map((post,index)=><Link className="post-row" to={`/blog/${post.slug}`} key={post.slug}><span className="post-index">{String(index+1).padStart(2,"0")}</span><div><h3>{post.title}</h3><p>{post.summary}</p><div className="post-tags">{post.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div><time>{post.date}</time></Link>)}</div>:<div className="blog-empty"><span>ISSUE 00</span><h3>No published posts yet.</h3><p>The blog structure is live and Markdown-ready. Drafts stay invisible until they are marked published.</p></div>}</div>;
}

function BlogPost(){
  const{slug}=useParams();
  const post=posts.find(item=>item.slug===slug&&item.published!==false);
  if(!post)return <div className="view page-view"><div className="blog-empty"><span>404</span><h3>Post not found.</h3><Link to="/blog">← back to blog</Link></div></div>;
  return <article className="view article-view"><Link className="back-link" to="/blog">← BLOG</Link><header className="article-head"><time>{post.date}</time><h2>{post.title}</h2><p>{post.summary}</p></header><div className="article-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown></div></article>;
}

function BrandMark({item}){
  if(item.icon)return <img src={`https://cdn.simpleicons.org/${item.icon}/d7d9df`} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";e.currentTarget.nextElementSibling?.classList.add("show")}}/>;
  return <span className="brand-fallback show">{item.monogram||item.name.slice(0,2).toUpperCase()}</span>;
}

function UsesPage(){
  return <div className="view page-view uses-page"><div className="page-mast"><div><span className="eyebrow">USES / SOFTWARE</span><h2>The tools behind<br/>my screen time.</h2></div><p>A personal software shelf, not a recommendation list. The live “today” percentages stay on Home; this page is the slower, more permanent inventory.</p></div><div className="page-rule"/><div className="uses-grid">{config.software.map(group=><section className="uses-group" key={group.group}><div className="uses-group-head"><h3>{group.group}</h3><span>{group.note}</span></div><div className="software-list">{group.items.map(item=><div className="software-item" key={item.name}><div className="software-icon"><BrandMark item={item}/>{item.icon&&<span className="brand-fallback">{item.monogram||item.name.slice(0,2).toUpperCase()}</span>}</div><div><b>{item.name}</b><span>{item.meta}</span></div></div>)}</div></section>)}</div><div className="uses-foot"><span>Hardware stays on Home for now.</span><span>Software icons · Simple Icons CDN</span></div></div>;
}

function SiteRouter({presence}){
  return <BrowserRouter><Routes><Route element={<Layout presence={presence}/>}><Route index element={null}/><Route path="photo" element={<PhotoPage/>}/><Route path="photos" element={<Navigate to="/photo" replace/>}/><Route path="blog" element={<BlogPage/>}/><Route path="blog/:slug" element={<BlogPost/>}/><Route path="uses" element={<UsesPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></BrowserRouter>;
}
function LanyardApp(){const presence=useLanyard(config.discordId);return <SiteRouter presence={presence}/>}
function App(){return config.discordId?<LanyardApp/>:<SiteRouter presence={null}/>}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
