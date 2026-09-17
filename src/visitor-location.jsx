import React,{useEffect,useMemo,useState} from "react";
import "./visitor-location.css";

const TIMEZONE_COUNTRY={
  "Asia/Shanghai":"CN","Asia/Chongqing":"CN","Asia/Urumqi":"CN","Asia/Harbin":"CN",
  "Asia/Hong_Kong":"HK","Asia/Macau":"MO","Asia/Taipei":"TW","Asia/Tokyo":"JP","Japan":"JP",
  "Asia/Seoul":"KR","Asia/Singapore":"SG","Asia/Bangkok":"TH","Asia/Kuala_Lumpur":"MY",
  "Asia/Jakarta":"ID","Asia/Manila":"PH","Asia/Kolkata":"IN","Asia/Calcutta":"IN",
  "Asia/Dubai":"AE","Asia/Jerusalem":"IL","Europe/London":"GB","Europe/Paris":"FR",
  "Europe/Berlin":"DE","Europe/Madrid":"ES","Europe/Rome":"IT","Europe/Amsterdam":"NL",
  "Europe/Warsaw":"PL","Europe/Prague":"CZ","Europe/Moscow":"RU","Europe/Kyiv":"UA",
  "America/New_York":"US","America/Chicago":"US","America/Denver":"US","America/Los_Angeles":"US",
  "America/Phoenix":"US","America/Anchorage":"US","Pacific/Honolulu":"US","America/Toronto":"CA",
  "America/Vancouver":"CA","America/Mexico_City":"MX","America/Sao_Paulo":"BR",
  "America/Argentina/Buenos_Aires":"AR","Australia/Sydney":"AU","Australia/Melbourne":"AU",
  "Australia/Brisbane":"AU","Australia/Perth":"AU","Pacific/Auckland":"NZ"
};

const displayNames=typeof Intl.DisplayNames==="function"?new Intl.DisplayNames(["en"],{type:"region"}):null;
const countryName=code=>{if(!code)return "Unknown";try{return displayNames?.of(code)||code}catch{return code}};
const safeText=value=>typeof value==="string"&&value.trim()?value.trim():null;
const explicitRegion=language=>{try{return new Intl.Locale(language).region||null}catch{return null}};
const formatOffset=minutes=>{if(!Number.isFinite(minutes))return "unknown";const sign=minutes>=0?"+":"-",abs=Math.abs(minutes),h=String(Math.floor(abs/60)).padStart(2,"0"),m=String(abs%60).padStart(2,"0");return `UTC${sign}${h}:${m}`};

function offsetForTimeZone(timeZone,date=new Date()){
  if(!timeZone)return null;
  try{
    const parts=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).formatToParts(date);
    const p=Object.fromEntries(parts.filter(part=>part.type!=="literal").map(part=>[part.type,part.value]));
    const asUTC=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour)%24,Number(p.minute),Number(p.second));
    return Math.round((asUTC-date.getTime())/60000);
  }catch{return null}
}

function browserSignals(){
  const resolved=Intl.DateTimeFormat().resolvedOptions();
  const languages=(navigator.languages?.length?navigator.languages:[navigator.language]).filter(Boolean).slice(0,5);
  const timezone=resolved.timeZone||null;
  const timezoneCountry=TIMEZONE_COUNTRY[timezone]||null;
  const localeRegions=languages.map(explicitRegion).filter(Boolean);
  const browserOffset=-new Date().getTimezoneOffset();
  return {
    timezone,
    timezoneCountry,
    browserOffset,
    language:navigator.language||resolved.locale||null,
    languages,
    localeRegions,
    platform:navigator.userAgentData?.platform||navigator.platform||null
  };
}

function inferEnvironment(signals,networkCountry){
  const scores=new Map(),reasons=new Map();
  const add=(country,points,reason)=>{
    if(!country)return;
    scores.set(country,(scores.get(country)||0)+points);
    reasons.set(country,[...(reasons.get(country)||[]),reason]);
  };
  add(signals.timezoneCountry,4,"browser timezone");
  signals.localeRegions.forEach((region,index)=>add(region,index===0?2:1,index===0?"primary locale":"secondary locale"));
  const ranked=[...scores.entries()].map(([country,score])=>({country,score,reasons:reasons.get(country)||[]})).sort((a,b)=>b.score-a.score);
  const winner=ranked[0]||null;
  const strength=!winner?"insufficient":winner.score>=5?"strong":winner.score>=3?"medium":"light";
  const alternate=winner&&networkCountry&&winner.country!==networkCountry?winner:null;
  return {winner,alternate,strength,ranked};
}

function haversineKm(a,b){
  if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return null;
  const rad=value=>value*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),lat1=rad(a.lat),lat2=rad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

function SignalRow({label,value,tone}){
  return <div className="visitor-signal-row"><span>{label}</span><strong className={tone||""}>{value||"unavailable"}</strong></div>;
}

export default function VisitorLocationPage(){
  const[network,setNetwork]=useState(null);
  const[networkError,setNetworkError]=useState(false);
  const[deviceGeo,setDeviceGeo]=useState(null);
  const[geoState,setGeoState]=useState("idle");
  const signals=useMemo(()=>browserSignals(),[]);

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/visitor-location",{cache:"no-store",signal:controller.signal})
      .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
      .then(data=>setNetwork(data))
      .catch(error=>{if(error.name!=="AbortError")setNetworkError(true)});
    return()=>controller.abort();
  },[]);

  const inference=useMemo(()=>inferEnvironment(signals,network?.geo?.country||null),[signals,network]);
  const networkOffset=useMemo(()=>offsetForTimeZone(network?.geo?.timezone),[network?.geo?.timezone]);
  const offsetDelta=Number.isFinite(networkOffset)?Math.abs(signals.browserOffset-networkOffset):null;
  const networkPoint=network?.geo?.latitude!=null&&network?.geo?.longitude!=null?{lat:Number(network.geo.latitude),lng:Number(network.geo.longitude)}:null;
  const deviceDistance=haversineKm(deviceGeo,networkPoint);
  const networkPlace=[safeText(network?.geo?.city),countryName(network?.geo?.country)].filter(Boolean).join(", ")||"Location unavailable";
  const alternate=inference.alternate;
  const environmentHeadline=alternate?`${countryName(alternate.country)} looks more like your browser environment`:inference.winner?"Your network and browser signals broadly agree":"Not enough browser signal to make a location guess";
  const mismatch=Boolean(alternate)||(Number.isFinite(offsetDelta)&&offsetDelta>=60);

  const requestDeviceLocation=()=>{
    if(!navigator.geolocation){setGeoState("unsupported");return}
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      position=>{setDeviceGeo({lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy});setGeoState("done")},
      error=>setGeoState(error.code===1?"denied":"error"),
      {enableHighAccuracy:false,timeout:10000,maximumAge:60000}
    );
  };

  return <div className="view page-view visitor-page">
    <div className="page-mast visitor-mast">
      <div><span className="eyebrow">VISITOR / LOCATION</span><h2>Where are you,<br/><i>really?</i></h2></div>
      <p>Compare the geography of your current network with the timezone and locale your browser exposes. This is a consistency check, not a claim that a VPN can always be deanonymized.</p>
    </div>
    <div className="page-rule"/>

    <section className="visitor-grid">
      <article className="visitor-panel visitor-network">
        <div className="visitor-panel-head"><span>01 / NETWORK</span><small>Vercel Geo-IP</small></div>
        <div className="visitor-big"><span>you appear to connect from</span><strong>{network?networkPlace:networkError?"Network lookup unavailable":"Locating network…"}</strong></div>
        <div className="visitor-signals">
          <SignalRow label="public IP" value={network?.ip}/>
          <SignalRow label="country" value={network?.geo?.country?`${countryName(network.geo.country)} · ${network.geo.country}`:null}/>
          <SignalRow label="region" value={network?.geo?.region}/>
          <SignalRow label="IP timezone" value={network?.geo?.timezone}/>
        </div>
      </article>

      <article className="visitor-panel visitor-browser">
        <div className="visitor-panel-head"><span>02 / BROWSER</span><small>local signals</small></div>
        <div className="visitor-big"><span>your device says</span><strong>{signals.timezone||"Timezone unavailable"}</strong></div>
        <div className="visitor-signals">
          <SignalRow label="UTC offset" value={formatOffset(signals.browserOffset)}/>
          <SignalRow label="primary locale" value={signals.language}/>
          <SignalRow label="languages" value={signals.languages.join(" · ")}/>
          <SignalRow label="platform" value={signals.platform}/>
        </div>
      </article>

      <article className={`visitor-panel visitor-estimate ${mismatch?"is-mismatch":"is-match"}`}>
        <div className="visitor-panel-head"><span>03 / ESTIMATE</span><small>heuristic · {inference.strength} signal</small></div>
        <div className="visitor-estimate-copy">
          <span className="visitor-kicker">{mismatch?"THE SIGNALS DO NOT FULLY MATCH":"NO STRONG CONFLICT FOUND"}</span>
          <h3>{environmentHeadline}</h3>
          <p>{alternate
            ?`Your network resolves to ${countryName(network?.geo?.country)}, while ${alternate.reasons.join(" + ")} point toward ${countryName(alternate.country)}. VPN/proxy use is one explanation; travel, remote access, or unchanged device settings can look identical.`
            :`The browser timezone and locale do not provide a strong alternative to the network location. That does not prove the network location is your physical location.`}</p>
        </div>
        <div className="visitor-verdict">
          <span>network</span><b>{countryName(network?.geo?.country)}</b>
          <i>→</i>
          <span>environment</span><b>{inference.winner?countryName(inference.winner.country):"unknown"}</b>
        </div>
      </article>

      <article className="visitor-panel visitor-diagnostics">
        <div className="visitor-panel-head"><span>04 / WHY</span><small>transparent scoring</small></div>
        <div className="visitor-diagnostic-list">
          <SignalRow label="timezone hint" value={signals.timezoneCountry?`${countryName(signals.timezoneCountry)} · +4`:"no country mapping"} tone={signals.timezoneCountry&&signals.timezoneCountry!==network?.geo?.country?"warn":""}/>
          <SignalRow label="locale hint" value={signals.localeRegions[0]?`${countryName(signals.localeRegions[0])} · +2`:"no explicit region"} tone={signals.localeRegions[0]&&signals.localeRegions[0]!==network?.geo?.country?"warn":""}/>
          <SignalRow label="offset delta" value={Number.isFinite(offsetDelta)?`${offsetDelta} min`:"unavailable"} tone={Number.isFinite(offsetDelta)&&offsetDelta>=60?"warn":""}/>
        </div>
        <p className="visitor-note">The score measures agreement between exposed settings; it is not a statistical probability that a country is your real location.</p>
      </article>

      <article className="visitor-panel visitor-verify">
        <div className="visitor-panel-head"><span>05 / VERIFY</span><small>optional permission</small></div>
        <div>
          <h3>Want a much stronger check?</h3>
          <p>Ask the browser for device location, then compare it with the IP-derived coordinates. The coordinates stay in this tab; this page only calculates the distance locally.</p>
          <button type="button" onClick={requestDeviceLocation} disabled={geoState==="loading"}>{geoState==="loading"?"requesting…":geoState==="done"?"check again":"check device location"}</button>
        </div>
        <div className="visitor-device-result">
          {geoState==="done"&&<><span>network ↔ device</span><strong>{Number.isFinite(deviceDistance)?deviceDistance<1?"< 1 km":`~${Math.round(deviceDistance).toLocaleString()} km`:"network coordinates unavailable"}</strong><small>device accuracy ±{Math.round(deviceGeo.accuracy)} m</small></>}
          {geoState==="denied"&&<><strong>permission denied</strong><small>nothing else was requested</small></>}
          {geoState==="unsupported"&&<><strong>not supported</strong><small>this browser has no Geolocation API</small></>}
          {geoState==="error"&&<><strong>location unavailable</strong><small>the browser could not resolve a device position</small></>}
          {geoState==="idle"&&<><strong>off by default</strong><small>requires an explicit browser permission</small></>}
        </div>
      </article>
    </section>

    <div className="visitor-privacy"><span>PRIVACY NOTE</span><p>No WebRTC probe. No DNS-leak test. No persistent fingerprint ID. Browser signals are evaluated locally, and the optional device location is never sent by this feature.</p></div>
  </div>;
}
