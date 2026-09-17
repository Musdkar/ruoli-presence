const firstHeader=(req,name)=>{const value=req.headers?.[name];return Array.isArray(value)?value[0]:value||null};
const decodeHeader=value=>{if(!value)return null;try{return decodeURIComponent(value)}catch{return value}};
const numberHeader=value=>{const number=Number(value);return Number.isFinite(number)?number:null};

export default function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
  const forwarded=firstHeader(req,"x-vercel-forwarded-for")||firstHeader(req,"x-forwarded-for")||firstHeader(req,"x-real-ip");
  const ip=forwarded?.split(",")[0]?.trim()||null;
  const geo={
    country:firstHeader(req,"x-vercel-ip-country"),
    region:firstHeader(req,"x-vercel-ip-country-region"),
    city:decodeHeader(firstHeader(req,"x-vercel-ip-city")),
    timezone:decodeHeader(firstHeader(req,"x-vercel-ip-timezone")),
    postalCode:decodeHeader(firstHeader(req,"x-vercel-ip-postal-code")),
    latitude:numberHeader(firstHeader(req,"x-vercel-ip-latitude")),
    longitude:numberHeader(firstHeader(req,"x-vercel-ip-longitude"))
  };
  res.setHeader("Cache-Control","private, no-store, max-age=0");
  return res.status(200).json({ip,geo,source:"vercel-geo-headers"});
}
