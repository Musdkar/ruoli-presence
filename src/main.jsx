import React,{useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter,Link,NavLink,Navigate,Outlet,Route,Routes,useOutletContext,useParams} from "react-router-dom";
import {useLanyard} from "use-lanyard";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {MasonryPhotoAlbum,RowsPhotoAlbum} from "react-photo-album";
import "react-photo-album/masonry.css";
import "react-photo-album/rows.css";
import {Doughnut} from "react-chartjs-2";
import {ArcElement,Chart as ChartJS,Tooltip} from "chart.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {config} from "./config";
import {posts} from "./content/posts";
import "./styles.css";

ChartJS.register(ArcElement,Tooltip);
const safeJSON=(value,fallback=null)=>{if(!value)return fallback;if(typeof value==="object")return value;try{return JSON.parse(value)}catch{return fallback}};
const CardHead=({title,meta})=><div className="card-head"><span>{title}</span><small>{meta}</small></div>;
const Empty=({label,detail})=><div className="empty"><strong>{label}</strong><span>{detail}</span></div>;

function MapCard(){
  const ref=useRef(null);
  useEffect(()=>{
    if(!ref.current)return;
    const map=new maplibregl.Map({container:ref.current,style:"https://tiles.openfreemap.org/styles/dark",center:[config.lng,config.lat],zoom:8.4,attributionControl:false,interactive:false});
    map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
    const el=document.createElement("div");
    el.className="map-avatar";
    el.innerHTML=`<img src="${config.avatar}" alt="avatar">`;
    new maplibregl.Marker({element:el}).setLngLat([config.lng,config.lat]).addTo(map);
    return()=>map.remove();
  },[]);
  return <article className="card map-card"><div ref={ref} className="map-canvas"/><div className="map-shade"/><h2>{config.city}</h2><div className="map-pill">◎ {config.city}, {config.region} · city level</div></article>;
}

function WeatherCard(){
  const[weather,setWeather]=useState(null);
  useEffect(()=>{fetch(`https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=${encodeURIComponent(config.timezone)}`).then(r=>r.json()).then(d=>setWeather(d.current||null)).catch(()=>setWeather(false))},[]);
  const names={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",51:"Drizzle",61:"Rain",63:"Rain",65:"Heavy rain",80:"Showers",95:"Thunderstorm"};
  return <article className="card weather-card"><CardHead title="Weather · Wuhan" meta="Open-Meteo"/><div className="weather-main"><div><strong>{weather&&weather.temperature_2m!=null?Math.round(weather.temperature_2m)+"°":"--°"}</strong><span>{weather?(names[weather.weather_code]||"Current weather"):weather===false?"unavailable":"loading…"}</span></div>{weather&&<small>feels {Math.round(weather.apparent_temperature)}°<br/>wind {Math.round(weather.wind_speed_10m)} km/h</small>}</div></article>;
}

function SoftwareCard({apps}){
  if(!apps?.length)return <article className="card apps-card"><CardHead title="Software / today" meta="ActivityWatch"/><Empty label="ActivityWatch not linked" detail="Run bridge/activitywatch_bridge.py"/></article>;
  const top=apps.slice(0,5),total=top.reduce((s,a)=>s+a.minutes,0)||1,colors=["#8e7cff","#70a7ff","#ed7997","#6fc9b3","#50545e"],data={labels:top.map(a=>a.name),datasets:[{data:top.map(a=>a.minutes),backgroundColor:colors,borderWidth:0}]};
  return <article className="card apps-card"><CardHead title="Software / today" meta="ActivityWatch"/><div className="apps-body"><div className="chart-wrap"><Doughnut data={data} options={{cutout:"72%",plugins:{legend:{display:false},tooltip:{enabled:true}},animation:false}}/></div><div className="usage-list">{top.map((a,i)=><div className="usage-row" key={a.name}><span>{a.name}</span><i><b style={{width:`${a.minutes/total*100}%`,background:colors[i]}}/></i><strong>{Math.round(a.minutes/total*100)}%</strong></div>)}</div></div></article>;
}

function KeyboardCard(){
  return <article className="card keyboard-card"><CardHead title="Keyboard / today" meta="WhatPulse"/>{config.whatPulseHeatmapUrl?<a className="heatmap-link" href={config.whatPulseProfileUrl||config.whatPulseHeatmapUrl} target="_blank" rel="noreferrer"><img src={config.whatPulseHeatmapUrl} alt="WhatPulse keyboard heatmap"/></a>:<Empty label="WhatPulse heatmap not linked" detail="The full keyboard image will fit here without cropping once WhatPulse sharing is connected."/>}</article>;
}

function HomePhotoCard(){return <article className="card photos-card"><CardHead title="Photo / VRChat" meta="React Photo Album"/><div className="photo-album"><RowsPhotoAlbum photos={config.photos} targetRowHeight={220} spacing={6} padding={0}/></div><Link className="photo-open" to="/photo">open archive ↗</Link></article>}

function FitnessCard({health}){if(!health)return <article className="card fitness-card"><CardHead title="Fitness" meta="Health Auto Export"/><Empty label="Health not linked" detail="POST Step Count / Heart Rate to /api/health"/></article>;return <article className="card fitness-card"><CardHead title="Fitness" meta="Health Auto Export"/><div className="fitness-content"><div className="fitness-ring"><span>◎</span></div><div><strong>{Number(health.steps||0).toLocaleString()}</strong><small>steps today</small>{health.heartRate&&<em>{Math.round(health.heartRate)} bpm</em>}</div></div></article>}

function DevicesCard(){return <article className="card devices-card"><CardHead title="Devices" meta="daily / play"/><div className="device-columns"><DeviceGroup title="daily" items={[["MacBook Pro · M1 Pro","macOS"],["iPhone 16 Pro Max","mobile"],["AirPods Pro 3","audio"]]}/><DeviceGroup title="play" items={[["Quest 3","VR"],["Gaming Laptop","7945HX · RTX 5070 Ti"],["Xiaomi Pad 7S Pro","tablet"]]}/></div></article>}
function DeviceGroup({title,items}){return <div><h4>{title}</h4>{items.map(([n,m])=><div className="device" key={n}><b>{n}</b><span>{m}</span></div>)}</div>}

function StatusCard({presence}){const status=presence?.discord_status||"offline",activity=presence?.activities?.find(a=>a.name&&!['Spotify'].includes(a.name));return <article className="card status-card"><CardHead title="Status" meta="Lanyard"/><div className="status-main"><span className={`status-dot ${status}`}/><strong>{status}</strong><small>{activity?.details||activity?.name||(presence?"Discord presence":"Lanyard not linked")}</small></div></article>}
function MusicCard({presence}){const s=presence?.spotify;return <article className="card music-card"><CardHead title="Currently listening" meta="Lanyard / Spotify"/>{s?<><img className="album-art" src={s.album_art_url} alt={s.album}/><div className="track-info"><strong>{s.song}</strong><span>{s.artist}</span></div></>:<Empty label="nothing playing" detail={presence?"Spotify is idle":"Set VITE_DISCORD_ID after joining Lanyard"}/>}</article>}
function VrcStatus({presence}){const vrc=presence?.activities?.find(a=>/vrchat/i.test(a.name||'')||/vrchat/i.test(a.details||''));return vrc?<div className="vrc-line">VRChat · {vrc.details||vrc.state||"active"}</div>:null}

function Sidebar({presence}){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(t)},[]);
  const local=useMemo(()=>new Intl.DateTimeFormat('en-GB',{timeZone:config.timezone,hour:'2-digit',minute:'2-digit',hour12:false}).format(now),[now]);
  return <aside><div className="sidebar"><div className="kicker">About me</div><div className="identity"><img className="avatar" src={config.avatar} alt="avatar"/><div><h1>mostly<br/><i>online.</i></h1><p>Student, developer and VR enthusiast. Mostly code, VRChat, music, hardware and whatever I am building next.</p></div></div><div className="rule"/><dl><div><dt>based in</dt><dd>Wuhan, China</dd></div><div><dt>local time</dt><dd>{local}</dd></div><div><dt>presence</dt><dd>● {presence?.discord_status||'not linked'}</dd></div></dl><VrcStatus presence={presence}/><div className="social-block"><div className="social-title">Connect</div><div className="socials">{config.socialLinks.map(link=>link.href?<a key={link.label} href={link.href} target="_blank" rel="noreferrer" title={link.name}>{link.label}</a>:<span key={link.label} className="disabled" title={`${link.name} not linked`}>{link.label}</span>)}</div></div><div className="sidebar-note"><b>One identity, four views.</b><br/>Home is the live surface; Photo, Blog and Uses reuse the same fixed identity rail.</div></div></aside>;
}

function Layout({presence}){
  return <><header><Link className="brand" to="/">RUOLI<b>.</b></Link><nav>{[["/","HOME"],["/photo","PHOTO"],["/blog","BLOG"],["/uses","USES"]].map(([to,label])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>isActive?"active":""}>{label}</NavLink>)}</nav><div className="edition">digital presence<br/>wuhan edition · 2026</div></header><main><Sidebar presence={presence}/><section className="content"><Outlet context={{presence}}/></section></main></>;
}

function Home(){
  const{presence}=useOutletContext();
  const apps=safeJSON(presence?.kv?.apps_today,null)?.apps||[];
  const health=safeJSON(presence?.kv?.health_today,null);
  return <div className="view home-view"><div className="grid"><StatusCard presence={presence}/><WeatherCard/><MapCard/><MusicCard presence={presence}/><HomePhotoCard/><FitnessCard health={health}/><DevicesCard/><SoftwareCard apps={apps}/><KeyboardCard/></div></div>;
}

function PhotoPage(){
  return <div className="view page-view photo-page"><div className="page-mast"><div><span className="eyebrow">PHOTO / ARCHIVE</span><h2>VRChat, places,<br/>and fragments.</h2></div><p>A visual archive. Mixed portrait and landscape images are laid out by React Photo Album rather than forced into one crop ratio.</p></div><div className="page-rule"/><div className="photo-wall"><MasonryPhotoAlbum photos={config.photos} columns={width=>width<700?1:width<1200?2:3} spacing={10}/></div>{config.photos.length===1&&<div className="archive-note">One image in the archive for now. Add more files later and the layout will rebalance automatically.</div>}</div>;
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
  return <BrowserRouter><Routes><Route element={<Layout presence={presence}/>}><Route index element={<Home/>}/><Route path="photo" element={<PhotoPage/>}/><Route path="photos" element={<Navigate to="/photo" replace/>}/><Route path="blog" element={<BlogPage/>}/><Route path="blog/:slug" element={<BlogPost/>}/><Route path="uses" element={<UsesPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></BrowserRouter>;
}
function LanyardApp(){const presence=useLanyard(config.discordId);return <SiteRouter presence={presence}/>}
function App(){return config.discordId?<LanyardApp/>:<SiteRouter presence={null}/>}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
