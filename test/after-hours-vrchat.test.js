import { describe, it, expect, vi } from 'vitest';
import { getDisplayPresence } from '../src/lib/presence.js';
import { selectVrchatPresence } from '../experiments/after-hours/lib/vrchat-presence.mjs';
import { createPresenceHandler } from '../experiments/after-hours/api/presence.js';
const now = Date.parse('2026-10-10T05:00:00Z');
const observedAt = new Date(now).toISOString();
const phone = JSON.stringify({status:'online',updatedAt:observedAt});
const presence = status => ({discord_status:'offline',activities:[],kv:{phone_presence:phone,vrchat_presence:{status,observedAt}}});
describe('independent iPhone and VRChat signals',()=>{
 it('phone online and VRChat offline remain independent',()=>{
  const data=presence('offline');
  expect(getDisplayPresence(data,now).status).toBe('online');
  expect(selectVrchatPresence(data,now,now)).toMatchObject({live:false,state:'OFFLINE',source:'OWNER SYNC'});
 });
 it('VRChat web active never lights the game-online tile',()=>{
  expect(selectVrchatPresence(presence('active'),now,now)).toMatchObject({live:false,state:'WEB ACTIVE'});
 });
 it('social moods cannot be used as connection presence',()=>{
  for(const status of ['busy','join me','ask me'])expect(selectVrchatPresence(presence(status),now,now).live).toBe(false);
 });
 it('game online does not change iPhone sleep',()=>{
  const data=presence('online');data.kv.phone_presence=JSON.stringify({status:'sleeping',updatedAt:observedAt});
  expect(getDisplayPresence(data,now).status).toBe('sleeping');
  expect(selectVrchatPresence(data,now,now).live).toBe(true);
 });
 it('expires the owner signal without another successful fetch',()=>{
  expect(selectVrchatPresence(presence('online'),now,now+180000)).toMatchObject({live:false,state:'NO PUBLIC SIGNAL'});
 });
 it('ignores future records and stale Discord activities',()=>{
  const data=presence('online');data.kv.vrchat_presence.observedAt=new Date(now+61000).toISOString();
  expect(selectVrchatPresence(data,now,now).live).toBe(false);
  delete data.kv.vrchat_presence;data.activities=[{name:'VRChat',details:'playing'}];
  expect(selectVrchatPresence(data,now,now+180000).live).toBe(false);
 });
 it('only actual VRChat activity is a fallback, not phone or Discord online',()=>{
  const data=presence('online');delete data.kv.vrchat_presence;data.discord_status='online';
  expect(selectVrchatPresence(data,now,now).live).toBe(false);
  data.activities=[{name:'VRChat'}];expect(selectVrchatPresence(data,now,now).live).toBe(true);
 });
});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=JSON.parse(body);}};}
describe('preview anonymous read API',()=>{
 it('reads only the fixed public owner and filters secrets without changing phone',async()=>{
  const data=presence('active');data.kv.secret='private';data.kv.vrchat_presence.cookie='private';
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({success:true,data})}));
  const handler=createPresenceHandler({fetcher});const res=response();
  await handler({method:'GET',url:'/api/presence?userId=attacker'},res);
  expect(fetcher.mock.calls[0][0]).toBe('https://api.lanyard.rest/v1/users/860859306156490762');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(res.statusCode).toBe(200);expect(res.body.data.kv.phone_presence).toBe(phone);
  expect(res.body.data.kv.secret).toBeUndefined();
  expect(res.body.data.kv.vrchat_presence).toEqual({status:'active',observedAt});
 });
 it('rejects writes before any network request',async()=>{
  const fetcher=vi.fn();const res=response();await createPresenceHandler({fetcher})({method:'PATCH'},res);
  expect(res.statusCode).toBe(405);expect(fetcher).not.toHaveBeenCalled();
 });
 it('does not cache an upstream failure or expose errors',async()=>{
  const res=response();await createPresenceHandler({fetcher:async()=>{throw new Error('Cookie=secret');}})({method:'GET'},res);
  expect(res.statusCode).toBe(503);expect(res.headers['Cache-Control']).toBe('no-store');
  expect(JSON.stringify(res.body)).not.toContain('secret');
 });
});
