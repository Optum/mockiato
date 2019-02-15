const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test.js');





let recId;
let id;
let recMadeServId;
let recMadeBase;
let recordedService;
let token = '?token=';

const resource    = '/api/recording';
const baseService = require('./resources/Recorder/Record_Test_Base_Service.json');
const serviceRequest = require('./resources/Recorder/recorder_test_rec-req.json');
const recorder = require('./resources/Recorder/recorder.1.json');

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
recorder.sut = mockGroup.name;
recorder.basePath = '/virtual/' + mockGroup.name + baseService.basePath;
recorder.remotePort = process.env.PORT;

describe('Recorder Tests', function() {
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
                    id = res.body._id;
                })
                .end(done);
        });
    });

   
    
   describe('Create Recorder',function(){
    it('Returns the recorder',function(done){
        request
            .put(resource + token)
            .set('content-type','application/json')
            .send(recorder)
            
            .expect(function(res){
                recId = res.body._id;
            })
            .expect(200)
            .end(done);
    });
   });

    describe('Get Recorder',function(){
        it('Returns the recorder',function(done){
            request
                .get(resource + "/" + recId)
                .expect(200)
                .end(done);

        });
    });

    describe('Request against Recorder',function(){
        it('Returns a good response',function(done){
            request
                .post('/recording/live/' + mockGroup.name + "/virtual/" + mockGroup.name + baseService.basePath)
                .send(serviceRequest)
                .expect(function(res){
                    console.log(res.error);
                })
                .expect(200)
                .end(done);
        });
    });

    describe('Confirm RR Pair was recorded',function(){
        it('Returns Recorder with recorded RR Pair',function(done){
            request
                .get(resource + "/" + recId)
                .expect(function(res){
                    if(!Array.isArray(res.body.service.rrpairs) || res.body.service.rrpairs.length != 1)
                        throw new Error("RRPair is missing from recording.");
                }).end(done);
        });
    });

    describe('Start/Stop recorder',function(){
        it('Stops the recorder',function(done){
            request
                .patch(resource + "/" + recId + "/stop")
                .expect(200,done);
        });
        it('Verifies the recorder is stopped',function(done){
            request
                .post('/recording/live/' + mockGroup.name + "/virtual/" + mockGroup.name + baseService.basePath)
                .send(serviceRequest)
                .expect(404)
                .end(done);
        });

        it('Starts the recorder',function(done){
            request
                .patch(resource + "/" + recId + "/start")
                .expect(200,done);
        });
        it('Verifies the recorder is started',function(done){
            request
                .post('/recording/live/' + mockGroup.name + "/virtual/" + mockGroup.name + baseService.basePath)
                .send(serviceRequest)
                .expect(200)
                .end(done);
        });
    });

    describe('Convert Recording to Service',function(){
        it('Gets service from recording', function(done){
            request
                .get(resource + "/" + recId)
                .expect(200)
                .expect(function(res){
                    recordedService = res.body.service;
                    console.log(recordedService);
                })
                .end(done);
        });
        it('Creates the service',function(done){
            request
                .post('/api/services' + token)
                .send(recordedService)
                .expect(200)
                .expect(function(res){
                    recMadeServId = res.body._id;
                    recMadeBase = res.body.basePath;
                })
                .end(done);
        });
        it('Verifies service was created',function(done){
            request
                .post("/virtual/" + mockGroup.name + baseService.basePath)
                .send(serviceRequest)
                .expect(200,done);
        })
        it('Deletes the recording',function(done){
            request
                .delete(resource + "/" + recId)
                .expect(200,done);
        });
        it('Verifies the recorder is deleted',function(done){
            request
                .post('/recording/live/' + mockGroup.name + "/virtual/" + mockGroup.name + baseService.basePath)
                .send(serviceRequest)
                .expect(404)
                .end(done);
        });
    });


    describe('Cleanup', function() {
        it('Deletes recorded service', function(done) {
            request
                .delete('/api/services/' + recMadeServId + token)
                .expect(200)
                .end(done);
        });
        it('Deletes the base service', function(done) {
            request
                .delete('/api/services/' + id + token)
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

