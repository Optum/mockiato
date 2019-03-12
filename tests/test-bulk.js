const app = require('../app');
const request = require('supertest').agent(app);
const fs = require('fs');
const test = require('./test-recorder.js');




let id, filename;
let token = '?token=';

const bulkZip = fs.readFileSync("./tests/resources/bulk/bulk.zip");
const req = require("./resources/bulk/bulk_post.json");

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



describe('Bulk Upload Tests', function() {
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
        
       

    });

    describe('Bulk upload',function(){
        it('Sends zip to application',function(done){
            request
                .post('/api/services/fromPairs/upload' + token)
                .attach('zipFile','./tests/resources/bulk/bulk.zip')
                .expect(200)
                .expect(function(res){
                    filename = res.body;
                    })
                .end(done);
        });
        it('Publishes the service',function(done){
            setTimeout(function(){
                request
                    .post('/api/services/fromPairs/publish?type=REST&group=' + mockGroup.name + '&uploaded_file_name_id=' + filename + '&url=eligibility/v1&name=TestName&' + token.slice(1))
                    .expect(200)
                    .expect(function(res){
                        id = res.body._id;
                    })
                    .end(done);
            },1000);
        });
        it('Tests the get request',function(done){
            request
                .get('/virtual/' + mockGroup.name + '/eligibility/v1/details/465039173')
                .expect(200,done);
        });
        it('Tests the post request',function(done){
            request
                .post('/virtual/' + mockGroup.name + '/eligibility/v1/search')
                .set('content-type','application/json')
                .send(req)
                .expect(200,done);
        });
            
    });

 
    describe('Cleanup', function() { 
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

