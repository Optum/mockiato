const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test-recorder.js');
const www = require('../bin/www');





let id;
let token = '?token=';

const service = require("./resources/Search/Search_Test_Service.json");


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
    });

   describe('Search',function(){
    it('Searches on id',function(done){
        request
            .get('/api/services/search/' + id)
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });

    it('Searches on reqData',function(done){
        request
            .get('/api/services/search?requestContains=innterTest2')
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Searches on resData',function(done){
        request
            .get('/api/services/search?responseContains=virtual')
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Searches on name',function(done){
        request
            .get('/api/services/search?name=Search%20Test')
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Sorts on created',function(done){
        request
            .get('/api/services/search?sortBy=created&asc')
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Sorts on updated',function(done){
        request
            .get('/api/services/search?sortBy=updated&asc')
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Limits to 0',function(done){
        request
            .get('/api/services/search?requestContains=innter&limit=0')
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length != 0){
                    throw new Error("Improper results returned.");
                }
            })
            .end(done);
    });
    it('Searches based on authorization',function(done){
        request
            .get('/api/services/search?responseContains=virtual&authorizedOnly=' + mockUser.username)
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
   });
   describe("Getters",function(){
    it('Gets based on user',function(done){
        request
            .get('/api/services/user/' + mockUser.username)
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Gets based on sut',function(done){
        request
            .get('/api/services/sut/' + mockGroup.name)
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
    it('Gets based on query',function(done){
        request
            .get('/api/services?sut=' + mockGroup.name + "&user=" + mockUser.username)
            .expect(200)
            .expect(function(res){
                if(!Array.isArray(res.body) || res.body.length <= 0){
                    throw new Error("No results returned.");
                }
            })
            .end(done);
    });
   })

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

