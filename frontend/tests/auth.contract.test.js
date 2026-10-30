import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PactV3,MatchersV3} from '@pact-foundation/pact';
import {loginRequest} from '../src/services/authClient.js';
test('frontend login contract',async()=>{const pact=new PactV3({consumer:'EventFlowReact',provider:'EventFlowApi',dir:'pacts'});pact.given('a viewer exists').uponReceiving('valid viewer login').withRequest({method:'POST',path:'/api/auth/login',headers:{'Content-Type':'application/json'},body:{email:'contract@example.com',password:'contract-password-123'}}).willRespondWith({status:200,headers:{'Content-Type':'application/json'},body:{data:{email:'contract@example.com',role:'VIEWER',token:MatchersV3.like('signed-token'),expiresAt:MatchersV3.like('2026-10-30T10:00:00Z')}}});await pact.executeTest(async server=>{const user=await loginRequest(server.url+'/api','contract@example.com','contract-password-123');assert.equal(user.role,'VIEWER');assert.ok(user.token)})});
