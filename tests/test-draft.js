const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test-recorder.js');
const www = require('../bin/www');





let id;
let token = '?token=';

const service = require("./resources/Draft/Draft_Test_Service.json");
const testReq = require("./resources/Draft/draft_test-req.json");


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


service.sut = mockGroup;

describe('Search and Get Tests', function() {
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
        it('Ensures the service works',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .send(testReq)
                .expect(200,done);
        });

    });

   describe('Draft and Archive',function(){
        it('Archives the service',function(done){
            request
                .delete('/api/services/' + id + token)
                .expect(200,done);
        });
        it('Ensures the service no longer works',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .send(testReq)
                .expect(404,done);
        });
        it('Gets the archived service',function(done){
            request
                .get('/api/services/archive/' + id)
                .expect(200,done);
        });
        it('Gets the archived service via user',function(done){
            request
                .get('/api/services/user/' + mockUser.username + '/archive')
                .expect(200)
                .expect(function(res){
                    if(!Array.isArray(res.body) || res.body.length <= 0){
                        throw new Error("No results returned.");
                    }
                })
                .end(done);
        });
        it('Gets the archived service via sut',function(done){
            request
                .get('/api/services/sut/' + mockGroup.name + '/archive')
                .expect(200)
                .expect(function(res){
                    if(!Array.isArray(res.body) || res.body.length <= 0){
                        throw new Error("No results returned.");
                    }
                })
                .end(done);
        });
        it('Gets the archived service via query',function(done){
            request
                .get('/api/services/archive?sut=' + mockGroup.name + '&user=' + mockUser.username)
                .expect(200)
                .expect(function(res){
                    if(!Array.isArray(res.body) || res.body.length <= 0){
                        throw new Error("No results returned.");
                    }
                })
                .end(done);
        });
        it('Unarchives the service',function(done){
            request
                .post('/api/services/archive/' + id + '/restore' + token)
                .expect(200)
                .expect(function(rsp){
                    id = rsp.body.id;
                })
                .end(done);
        });
        /*it('Starts the service',function(done){
            request
                .post('/api/services/' + id + '/toggle' + token)
                .expect(200)
                .end(done);
        });
        it('Ensures the service works',function(done){
            request
                .post('/virtual/' + mockGroup.name + service.basePath)
                .send(testReq)
                .expect(200,done);
        });*/
   });
 
    describe('Cleanup', function() {
        /*it('Deletes the service', function(done) {
            request
                .delete('/api/services/' + id + token)
                .expect(200)
                .end(done);
        });*/
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

