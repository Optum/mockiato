const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test-recorder.js');
const www = require('../bin/www');





let id;
let token = '?token=';


const service = require("./resources/Match_Template/Matching_Test_Service.json");
const requests = require("./resources/Match_Template/requests.json");



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

describe('Match Template Tests', function() {
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
        it('Creates the service', function(done) {
            request
                .post('/api/services' + token)
                .send(service)
                .expect(200)
                .expect(function(res){
                    id = res.body._id;
                    console.log(res.body.rrpairs);
                })
                .end(done);
        });
    });

    describe('Tests match template with and without conditions',function(){
        for(let req of requests){
            it(req.desc,function(done){
                request
                    .post('/virtual/' + mockGroup.name + service.basePath)
                    .send(req.req)
                    .expect(req.status)
                    .end(done);
            });
        }
    });
    


    describe('Cleanup', function() {
        it('Deletes the service', function(done) {
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

