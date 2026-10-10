import unittest,json,os,tempfile
from datetime import datetime,timezone
from presence_publisher import PresencePublisher, public_record
OWNER='usr_owner'
NOW=datetime(2026,10,10,5,0,tzinfo=timezone.utc)
class Response:
 def __init__(self,status=200,data=None,headers=None):self.status_code=status;self.data=data;self.headers=headers or {}
 def json(self):return self.data
class Session:
 def __init__(self,response):self.response=response;self.calls=[]
 def get(self,*args,**kwargs):self.calls.append((args,kwargs));return self.response
 def patch(self,*args,**kwargs):self.calls.append((args,kwargs));return self.response
class PublisherTests(unittest.TestCase):
 def test_state_wins_over_social_status_and_raw_fields_are_dropped(self):
  for state in ('online','active','offline'):
   record=public_record({'id':OWNER,'state':state,'status':'active','location':'private','friends':['secret'],'auth':'secret'},OWNER,NOW)
   self.assertEqual(record['status'],state);self.assertEqual(record['observedAt'],'2026-10-10T05:00:00.000Z')
   self.assertEqual(set(record),{'status','observedAt','availability','location'} if state=='online' else {'status','observedAt','availability'} if state=='active' else {'status','observedAt'})
   if state=='online':self.assertEqual(record['location'],{'kind':'private'})
 def test_wrong_owner_unknown_or_2fa_is_not_published(self):
  for payload in ({'id':'other','state':'online'},{'id':OWNER,'state':'unexpected'},{'id':OWNER,'state':'online','requiresTwoFactorAuth':['totp']}):
   self.assertIsNone(public_record(payload,OWNER,NOW))
 def test_fixed_key_only_and_cookie_session_never_sent_to_lanyard(self):
  source=Session(Response(data={'id':OWNER,'state':'offline','status':'active'}));writer=Session(Response())
  publisher=PresencePublisher(OWNER,'private-test-key',writer=writer,clock=lambda:NOW,monotonic=lambda:0,jitter=lambda a,b:a)
  publisher.tick(source,OWNER)
  self.assertEqual(len(source.calls),1);self.assertEqual(len(writer.calls),1)
  args,kwargs=writer.calls[0];self.assertEqual(args[0],'https://api.lanyard.rest/v1/users/860859306156490762/kv')
  self.assertEqual(list(kwargs['json']),['vrchat_presence']);self.assertEqual(json.loads(kwargs['json']['vrchat_presence'])['status'],'offline')
  self.assertNotIn('Cookie',kwargs['headers'])
 def test_disabled_and_other_account_never_query(self):
  source=Session(Response(data={}));writer=Session(Response())
  PresencePublisher(OWNER,'',writer=writer).tick(source,OWNER)
  PresencePublisher(OWNER,'private-test-key',writer=writer).tick(source,'other')
  self.assertEqual(source.calls,[]);self.assertEqual(writer.calls,[])
 def test_auth_error_and_429_do_not_create_offline_or_retimestamp(self):
  for code in (401,429,500):
   source=Session(Response(code,headers={'Retry-After':'300'}));writer=Session(Response())
   publisher=PresencePublisher(OWNER,'private-test-key',writer=writer,clock=lambda:NOW,monotonic=lambda:10,jitter=lambda a,b:a)
   publisher.tick(source,OWNER);publisher.tick(source,OWNER)
   self.assertEqual(len(source.calls),1);self.assertEqual(writer.calls,[])
   self.assertGreaterEqual(publisher.next_due,70)
 def test_lanyard_auth_failure_pauses_publication(self):
  source=Session(Response(data={'id':OWNER,'state':'online'}));writer=Session(Response(401))
  publisher=PresencePublisher(OWNER,'bad-test-key',writer=writer,clock=lambda:NOW,monotonic=lambda:10,jitter=lambda a,b:a)
  publisher.tick(source,OWNER);publisher.tick(source,OWNER)
  self.assertEqual(len(writer.calls),1);self.assertFalse(publisher.enabled)
 def test_private_config_wrong_shape_is_disabled(self):
  with tempfile.TemporaryDirectory() as folder:
   path=os.path.join(folder,'presence-private.json')
   with open(path,'w') as handle:json.dump([],handle)
   os.chmod(path,0o600)
   self.assertFalse(PresencePublisher.from_private_config('kai',path).enabled)
 def test_normal_logs_do_not_record_game_state(self):
  source=Session(Response(data={'id':OWNER,'state':'online'}));writer=Session(Response())
  publisher=PresencePublisher(OWNER,'private-test-key',writer=writer,clock=lambda:NOW,monotonic=lambda:10,jitter=lambda a,b:a)
  with self.assertLogs('after-hours-presence',level='INFO') as captured:publisher.tick(source,OWNER)
  self.assertNotIn('online',' '.join(captured.output))

class LocationTests(unittest.TestCase):
 def test_private_and_hidden_status_never_publish_a_world_name(self):
  for extra in ({'location':'private'}, {'location':'wrld_11111111-1111-1111-1111-111111111111:42~private(usr_owner)'}, {'status':'ask me','location':'wrld_11111111-1111-1111-1111-111111111111:42'}, {'status':'busy','location':'wrld_11111111-1111-1111-1111-111111111111:42'}):
   record=public_record({'id':OWNER,'state':'online',**extra},OWNER,NOW)
   self.assertEqual(record.get('location'),{'kind':'private'})
 def test_traveling_ignores_the_destination_and_active_drops_old_location(self):
  user={'id':OWNER,'state':'online','presence':{'world':'traveling','instance':'','travelingToWorld':'wrld_private'}}
  self.assertEqual(public_record(user,OWNER,NOW).get('location'),{'kind':'traveling'})
  user['state']='active'
  self.assertNotIn('location',public_record(user,OWNER,NOW))
 def test_visible_world_uses_authenticated_presence_and_never_exposes_ids(self):
  wid='wrld_11111111-1111-1111-1111-111111111111'
  user={'id':OWNER,'state':'online','location':'private','presence':{'world':wid,'instance':'42~hidden(usr_someone)~region(jp)~nonce(secret)'}}
  world={'id':wid,'name':'A quiet world','releaseStatus':'public','instances':['secret'],'authorId':'secret'}
  record=public_record(user,OWNER,NOW,world=world)
  self.assertEqual(record['location'],{'kind':'world','worldName':'A quiet world','access':'friends+'})
  self.assertNotIn('secret',json.dumps(record));self.assertNotIn(wid,json.dumps(record))
 def test_unknown_qualifiers_or_private_world_metadata_fail_closed(self):
  wid='wrld_11111111-1111-1111-1111-111111111111';base={'id':OWNER,'state':'online'}
  for tag in (wid+':42~futureAccess(hidden)',wid, 'https://attacker.invalid/path'):
   record=public_record({**base,'location':tag},OWNER,NOW)
   self.assertEqual(record.get('location'),{'kind':'unknown'})
  record=public_record({**base,'location':wid+':42'},OWNER,NOW,world={'id':wid,'name':'secret','releaseStatus':'private'})
  self.assertEqual(record.get('location'),{'kind':'private'})
 def test_cached_world_metadata_never_preserves_the_previous_room(self):
  wid='wrld_11111111-1111-1111-1111-111111111111'
  class Source:
   def __init__(self):self.private=False;self.world_reads=0
   def get(self,url,**kw):
    if '/users/' in url:return Response(data={'id':OWNER,'state':'online'})
    if '/auth/user' in url:return Response(data={'id':OWNER,'state':'offline','presence':{'world':'private' if self.private else wid,'instance':'42'}})
    self.world_reads+=1;return Response(data={'id':wid,'name':'Visible world','releaseStatus':'public'})
  source=Source();writer=Session(Response());t=[0]
  pub=PresencePublisher(OWNER,'private-test-key',writer=writer,clock=lambda:NOW,monotonic=lambda:t[0],jitter=lambda a,b:a)
  pub.tick(source,OWNER);t[0]=100;pub.tick(source,OWNER)
  self.assertEqual(source.world_reads,1)
  self.assertEqual(json.loads(writer.calls[-1][1]['json']['vrchat_presence'])['location']['worldName'],'Visible world')
  source.private=True;t[0]=200;pub.tick(source,OWNER)
  record=json.loads(writer.calls[-1][1]['json']['vrchat_presence'])
  self.assertEqual(record['status'],'online');self.assertEqual(record['location'],{'kind':'private'})

class LocationFailureTests(unittest.TestCase):
 def test_conflicting_room_access_never_publishes_a_world_name(self):
  wid='wrld_11111111-1111-1111-1111-111111111111'
  user={'id':OWNER,'state':'online','location':wid+':42~friends(usr_owner)~group(grp_private)'}
  world={'id':wid,'name':'Must be hidden','releaseStatus':'public'}
  self.assertEqual(public_record(user,OWNER,NOW,world=world)['location'],{'kind':'unknown'})
 def test_explicit_private_instance_type_hides_a_bare_instance_id(self):
  user={'id':OWNER,'state':'online','presence':{'world':'wrld_11111111-1111-1111-1111-111111111111','instance':'42','instanceType':'private'}}
  self.assertEqual(public_record(user,OWNER,NOW).get('location'),{'kind':'private'})
 def test_auth_2fa_or_world_429_never_republishes_the_old_room(self):
  wid='wrld_11111111-1111-1111-1111-111111111111'
  for failure in ('auth','world'):
   class Source:
    def get(self,url,**kw):
     if '/users/' in url:return Response(data={'id':OWNER,'state':'online'})
     if '/auth/user' in url:return Response(data={'id':OWNER,'requiresTwoFactorAuth':['totp']} if failure=='auth' else {'id':OWNER,'presence':{'world':wid,'instance':'42'}})
     return Response(429,headers={'Retry-After':'1000'})
   writer=Session(Response());pub=PresencePublisher(OWNER,'private-test-key',writer=writer,clock=lambda:NOW,monotonic=lambda:0,jitter=lambda a,b:a)
   pub.tick(Source(),OWNER)
   self.assertEqual(writer.calls,[])
   if failure=='world':self.assertGreaterEqual(pub.next_due,1000)

class ProfileTests(unittest.TestCase):
 def test_current_presence_busy_also_hides_the_world(self):
  user={'id':OWNER,'state':'online','status':'active','presence':{'status':'busy','world':'wrld_11111111-1111-1111-1111-111111111111','instance':'42'}}
  self.assertEqual(public_record(user,OWNER,NOW).get('location'),{'kind':'private'})
 def test_profile_publishes_display_identity_without_raw_account_fields(self):
  image='https://api.vrchat.cloud/api/1/image/file_11111111-1111-1111-1111-111111111111/2/256'
  user={'id':OWNER,'state':'active','status':'ask me','displayName':'\x00 A name ','currentAvatarThumbnailImageUrl':image,'email':'secret','statusDescription':'secret','friends':['secret']}
  record=public_record(user,OWNER,NOW)
  self.assertEqual(record.get('profile'),{'displayName':'A name','avatarUrl':image})
  self.assertEqual(record['availability'],'ask me');self.assertEqual(record['status'],'active')
  self.assertNotIn('secret',json.dumps(record));self.assertNotIn('location',record)
 def test_avatar_urls_cannot_carry_credentials_or_use_other_hosts(self):
  base='https://api.vrchat.cloud/api/1/image/file_11111111-1111-1111-1111-111111111111/2/256'
  for image in (base+'?token=secret',base.replace('https://','https://user:secret@'),base.replace('api.vrchat.cloud','attacker.invalid'),base.replace('https://','http://')):
   record=public_record({'id':OWNER,'state':'offline','displayName':'A name','currentAvatarThumbnailImageUrl':image},OWNER,NOW)
   self.assertEqual(record.get('profile'),{'displayName':'A name'})
   self.assertNotIn('availability',record)
 def test_world_thumbnail_is_only_published_with_a_visible_world(self):
  wid='wrld_11111111-1111-1111-1111-111111111111'
  image='https://api.vrchat.cloud/api/1/image/file_22222222-2222-2222-2222-222222222222/1/256'
  world={'id':wid,'name':'A world','releaseStatus':'public','thumbnailImageUrl':image}
  user={'id':OWNER,'state':'online','location':wid+':42'}
  self.assertEqual(public_record(user,OWNER,NOW,world=world)['location'].get('thumbnailUrl'),image)
  for location in ('private','traveling'):
   user['location']=location;self.assertNotIn(image,json.dumps(public_record(user,OWNER,NOW,world=world)))

if __name__=='__main__':unittest.main()
