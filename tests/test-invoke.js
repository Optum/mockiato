const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test-recorder.js');
const www = require('../bin/www');





let id, baseId;
let token = '?token=';

const baseService = require("./resources/Invoke/Invoke_Test_Base_Service.json");
const service = require("./resources/Invoke/Invoke_Test_Service.json");
const requests = require('./resources/Invoke/invoke_test-reqs.json')


const mockUser = {
    username: getRandomString(),
    mail: getRandomString() + '@noreply.com',
    password: getRandomString()
}

const mockGroup = {
    name: getRandomString()
};

function getRandomString() {
    return  Math.random().toString(36).substring(2, 15);
}


baseService.sut = mockGroup;
service.sut = mockGroup;
service.liveInvocation.remotePort = process.env.PORT;
service.liveInvocation.remoteBasePath = '/virtual/' + mockGroup.name + baseService.basePath;

describe('Live Invocation Tests', function() {
    this.timeout(15000);

  
    describe('Setup', function() {
        it('Registers User', function(done) {
            request
                .post('/register')
                .send(mockUser)
                .expect(302)
                .end(done);
        });
        it('Gets the token', function(done) {
            request
                .post('/api/login')
                .send({ username: mockUser.username, password: mockUser.password })
                .expect(200)
                .expect(function(res) {
                    token = token + res.body.token;
                }).end(done);
        });
        it('Creates a group', function(done) {
            request
                .post('/api/systems' + token)
                .send(mockGroup)
                .expect(200)
                .end(done);
        });
        it('Creates the base service', function(done) {
            request
                .post('/api/services' + token)
                .send(baseService)
                .expect(200)
                .expect(function(res){
                    baseId = res.body._id;
                    console.log(res.body.rrpairs);
                })
                .end(done);
        });
        it('Creates the tested service', function(done) {
            request
                .post('/api/services' + token)
                .send(service)
                .expect(200)
                .expect(function(res){
                    id = res.body._id;
                })
                .end(done);
        });
    });

    describe('Tests Live-First Invocation',function(){
        it('Tests succesful live invocation',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .set('content-type','application/json')
                .send(requests[1])
                .expect(function(res){
                    console.log(res);
                })
                .expect(201)
                .expect('_mockiato-is-live-backend','true')
                .end(done);

        });
        it('Tests failover on status code',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .set('content-type','application/json')
                .send(requests[2])
                .expect(200)
                .expect('_mockiato-is-live-backend','false')
                .end(done);

        });
        it('Tests failover on string',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .set('content-type','application/json')
                .send(requests[3])
                .expect(200)
                .expect('_mockiato-is-live-backend','false')
                .end(done);

        });
    

    });

    describe('Test Live Invoke Learning',function(){
        let requestId;
        it('Validates that requests were recorded',function(done){
            request
                .get('/api/services/' + id + '/recorded')
                .expect(200)
                .expect(function(res){
                    if(res.body.liveInvocation.recordedRRPairs.length != 3)
                        throw new Error("Pairs were not properly recorded");
                    requestId = res.body.liveInvocation.recordedRRPairs[0]._id;
                })
                .end(done);
        });
        it('Merges in a recorded request',function(done){
            request
                .patch('/api/services/' + id + '/recorded/' + requestId + token)
                .expect(200,done);
        });
    });
   
    describe('Tests Virtual-First Live Invocation',function(){
        it('Changes service to virtual first mode',function(done){
            service.liveInvocation.liveFirst = false;
            request
                .put('/api/services/' + id + token)
                .send(service)
                .expect(200,done);
        });
        it('Tests succesful virtual-first',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .set('content-type','application/json')
                .send(requests[0])
                .expect(200)
                .expect('_mockiato-is-live-backend','false')
                .end(done);

        });
        it('Tests succesful missing virtual, then live',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .set('content-type','application/json')
                .send(requests[1])
                .expect(201)
                .expect('_mockiato-is-live-backend','true')
                .end(done);

        });
    });
    


    describe('Cleanup', function() {
        it('Deletes the service', function(done) {
            request
                .delete('/api/services/' + id + token)
                .expect(200)
                .end(done);
        });
        it('Deletes the base service', function(done) {
            request
                .delete('/api/services/' + baseId + token)
                .expect(200)
                .end(done);
        });
        it('Deletes group', function(done) {
            request
                .delete('/api/systems/' + mockGroup.name + token)
                .expect(200)
                .end(done);
        });
        it('Deletes user', function(done) {
            request
                .delete('/api/users/' + mockUser.username + token)
                .expect(200)
                .end(done);
        });
        
    });
    
    
});

