const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test.js');





let id;

let token = '?token=';

const resource    = '/api/';
const baseService = require('./resources/random/Random_Test_Base_Service.json');
const serviceRequest = require('./resources/random/random_test_rec-req.json');

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

describe('Random Tests', function() {
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

   
    
   

    describe('Request against Random',function(){
        it('Returns a good response',function(done){
            request
                .post('/virtual/' + mockGroup.name +baseService.basePath)
                .send(serviceRequest)
                .expect(200,done);
        });
    });

    


    describe('Cleanup', function() {
       
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

