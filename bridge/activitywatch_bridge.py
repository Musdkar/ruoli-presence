#!/usr/bin/env python3
"""Publish privacy-safe ActivityWatch app totals to Lanyard KV.

Raw window titles/URLs never leave the machine. Only app name + aggregated minutes are sent.
"""
import json,os,sys
from collections import defaultdict
from datetime import datetime,timedelta
import requests
from aw_client import ActivityWatchClient
from aw_client.queries import canonicalEvents

USER_ID=os.environ.get("LANYARD_USER_ID")
API_KEY=os.environ.get("LANYARD_API_KEY")
if not USER_ID or not API_KEY:
    sys.exit("Set LANYARD_USER_ID and LANYARD_API_KEY")

client=ActivityWatchClient("ruoli-presence-bridge",testing=False)
start=datetime.now().replace(hour=0,minute=0,second=0,microsecond=0)
end=start+timedelta(days=1)
events=canonicalEvents(client,start,end)
seconds=defaultdict(float)
for event in events:
    app=str(event.data.get("app") or "Unknown").strip()
    dur=event.duration.total_seconds() if hasattr(event.duration,"total_seconds") else float(event.duration)
    if app and dur>0:
        seconds[app]+=dur
apps=[{"name":name,"minutes":round(sec/60,1)} for name,sec in sorted(seconds.items(),key=lambda x:x[1],reverse=True)[:8]]
payload={"date":start.date().isoformat(),"apps":apps,"updatedAt":datetime.now().astimezone().isoformat()}
r=requests.patch(f"https://api.lanyard.rest/v1/users/{USER_ID}/kv",headers={"Authorization":API_KEY,"Content-Type":"application/json"},json={"apps_today":json.dumps(payload,ensure_ascii=False)},timeout=15)
r.raise_for_status()
print(json.dumps(payload,ensure_ascii=False,indent=2))
