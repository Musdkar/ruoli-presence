// Shape validation for published KV payloads. Anything that does not match
// the documented shape is treated as "not linked" rather than as data.
// A plausibility cap also keeps hostile numbers out of chart.js, which can
// freeze the tab on values around 2e307.

export const safeJSON=(value,fallback=null)=>{if(value==null||value==="")return fallback;if(typeof value==="object")return value;try{return JSON.parse(value)}catch{return fallback}};

// Type-check first, convert second: Number() on a non-primitive throws.
// Optional bounds reject negative, non-finite and absurdly large values.
export const toFiniteNumber=(value,max)=>{if(typeof value!=="number"&&typeof value!=="string")return null;const n=Number(value);if(Number.isFinite(n)===false)return null;if(n<0)return null;if(max!=null&&n>max)return null;return n};

// Cap the list and drop entries that are not { name: string, minutes: 0..1440 }.
export const MAX_APP_MINUTES=1440;
export const normalizeApps=(value)=>{const parsed=safeJSON(value,null);const raw=parsed!=null&&Array.isArray(parsed.apps)?parsed.apps:[];const out=[];for(const item of raw){if(item==null||typeof item!=="object"||Array.isArray(item))continue;if(typeof item.name!=="string")continue;const m=toFiniteNumber(item.minutes,1440);if(m==null)continue;out.push({name:item.name,minutes:m});if(out.length>=8)break}return out};

// Accept only an object with plausible steps (0..1000000) and/or
// heartRate (0..300); otherwise "not linked".
export const normalizeHealth=(value)=>{const parsed=safeJSON(value,null);if(parsed==null||typeof parsed!=="object"||Array.isArray(parsed))return null;const steps=toFiniteNumber(parsed.steps,1000000);const hr=toFiniteNumber(parsed.heartRate,300);if(steps==null&&hr==null)return null;return{steps:steps==null?0:steps,heartRate:hr}};
