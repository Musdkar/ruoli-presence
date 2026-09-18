const CACHE_VERSION=1;
const CACHE_MAX_AGE=30*60*1000;
const KV_KEYS=[
  "phone_presence",
  "apps_today",
  "health_today",
  "keyboard_today",
  "keyboard_yesterday",
  "music_now",
];

const cacheKey=(userId)=>`ruoli:lanyard:${CACHE_VERSION}:${userId}`;

function cleanText(value,max=300){
  return typeof value==="string"?value.slice(0,max):null;
}

export function sanitizePresence(value){
  if(value==null||typeof value!=="object"||Array.isArray(value))return null;
  const kv={};
  if(value.kv&&typeof value.kv==="object"&&!Array.isArray(value.kv)){
    for(const key of KV_KEYS){
      const item=value.kv[key];
      if(typeof item==="string"||item&&typeof item==="object")kv[key]=item;
    }
  }

  const activities=Array.isArray(value.activities)
    ? value.activities.slice(0,16).map((item)=>({
        name:cleanText(item?.name,120),
        details:cleanText(item?.details,240),
        state:cleanText(item?.state,240),
      })).filter((item)=>item.name||item.details||item.state)
    : [];

  const spot=value.spotify&&typeof value.spotify==="object"&&!Array.isArray(value.spotify)
    ? {
        song:cleanText(value.spotify.song,200),
        artist:cleanText(value.spotify.artist,200),
        album:cleanText(value.spotify.album,200),
        album_art_url:cleanText(value.spotify.album_art_url,2048),
      }
    : null;

  return{
    discord_status:cleanText(value.discord_status,32),
    activities,
    spotify:spot,
    kv,
  };
}

export function readCachedPresence(userId,now=Date.now()){
  if(!userId)return null;
  try{
    const raw=localStorage.getItem(cacheKey(userId));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(parsed?.v!==CACHE_VERSION||!Number.isFinite(parsed.savedAt)||now-parsed.savedAt>CACHE_MAX_AGE)return null;
    return sanitizePresence(parsed.presence);
  }catch{
    return null;
  }
}

export function writeCachedPresence(userId,value){
  if(!userId)return;
  const presence=sanitizePresence(value);
  if(!presence)return;
  try{
    localStorage.setItem(cacheKey(userId),JSON.stringify({
      v:CACHE_VERSION,
      savedAt:Date.now(),
      presence,
    }));
  }catch{}
}

export async function fetchLanyardPresence(userId,{signal}={}){
  if(!userId)return null;
  const response=await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`,{
    signal,
    cache:"no-store",
    headers:{Accept:"application/json"},
  });
  if(!response.ok)throw new Error(`Lanyard REST ${response.status}`);
  const payload=await response.json();
  if(payload?.success!==true)return null;
  return sanitizePresence(payload.data);
}
