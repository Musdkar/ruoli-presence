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
   self.assertEqual(record,{'status':state,'observedAt':'2026-10-10T05:00:00.000Z'})
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
if __name__=='__main__':unittest.main()
