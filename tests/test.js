process.env.MOCKIATO_AUTH = 'local';
process.env.MOCKIATO_MODE = 'single';

const app = require('../app');
const request = require('supertest').agent(app);
const YAML = require('yamljs');

let id = '';
let token = '?token=';

const resource    = '/api/services';
const swagService = './api-docs.yml';
const oasService  = './examples/petstore.yaml';
const wsdlService = './examples/hello-service.wsdl';
const restService = require('../examples/rest-json-example.json');
const soapService = require('../examples/soap-example.json');

const oasQuery = {
    'type': 'openapi',
    'base': '/oas/test',
    'name': 'oas-test',
    'group': 'test'
};

const wsdlQuery = {
    'type': 'wsdl',
    'base': '/wsdl/test',
    'name': 'wsdl-test',
    'group': 'test'
}

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

describe('API tests', function() {
    this.timeout(5000);

    before(function(done) {
        app.on('started', done);
    });

    describe('Register new user', function() {
        it('Redirects to login', function(done) {
            request
                .post('/register')
                .send(mockUser)
                .expect(302)
                .end(done);
        });
    });
    
    describe('Get access token', function() {
        it('Responds with the token', function(done) {
            request
                .post('/api/login')
                .send({ username: mockUser.username, password: mockUser.password })
                .expect(200)
                .expect(function(res) {
                    token = token + res.body.token;
                }).end(done);
        });
    });
    
    describe('Create REST service', function() {
        it('Responds with the new service', function(done) {
            request
                .post(resource + token)
                .send(restService)
                .expect(200)
                .expect(function(res) {
                    id = res.body._id;
                }).end(done);
        });
    });

    describe('Retrieve REST service', function() {
        it('Responds with the correct service', function(done) {
            request
                .get(resource + '/' + id)
                .expect(200)
                .end(done);
        });
    });
    
    describe('Test REST service', function() {
        it('Responds with the virtual data', function(done) {
            request
                .post('/virtual/test/v2/test/resource')
                .send({ key: 123 })
                .expect(200)
                .end(done);
        });
    });
    
    describe('Update REST service', function() {
        it('Responds with the updated service', function(done) {
            restService.rrpairs[0].resStatus = 201;
            request
                .put(resource + '/' + id + token)
                .send(restService)
                .expect(200)
                .end(done);
        });
    });
    
    describe('Toggle REST service', function() {
        it('Responds with the toggled service', function(done) {
            request
                .post(resource + '/' + id + '/toggle' + token)
                .send()
                .expect(200)
                .end(done);
        });
    });
    
    describe('Delete REST service', function() {
        it('Responds with the deleted service', function(done) {
            request
                .delete(resource + '/' + id + token)
                .expect(200)
                .end(done);
        });
    });
    
    describe('Create SOAP service', function() {
        it('Responds with the new service', function(done) {
            request
                .post(resource + token)
                .send(soapService)
                .expect(200)
                .expect(function(res) {
                    id = res.body._id;
                }).end(done);
        });
    });

    describe('Retrieve SOAP service', function() {
        it('Responds with the correct service', function(done) {
            request
                .get(resource + '/' + id)
                .expect(200)
                .end(done);
        });
    });
    
    describe('Test SOAP service', function() {
        it('Responds with the virtual data', function(done) {
            request
                .post('/virtual/test/soap')
                .set('Content-Type', 'text/xml')
                .send(soapService.rrpairs[0].reqData)
                .expect(200)
                .end(done);
        });
    });
    
    describe('Update SOAP service', function() {
        it('Responds with the updated service', function(done) {
            soapService.rrpairs[0].resHeaders['x-virt-app'] = 'Mockiato';
            request
                .put(resource + '/' + id + token)
                .send(restService)
                .expect(200)
                .end(done);
        });
    });
    
    describe('Delete SOAP service', function() {
        it('Responds with the deleted service', function(done) {
            request
                .delete(resource + '/' + id + token)
                .expect(200)
                .end(done);
        });
    });

    describe('Create service from WSDL', function() {
        it('Responds with the new service', function(done) {
            request
                .post(resource + '/fromSpec' + token)
                .query(wsdlQuery)
                .attach('spec', wsdlService)
                .send()
                .expect(200)
                .expect(function(res) {
                    id = res.body._id;
                })
                .end(done);
        });
    });

    describe('Delete WSDL service', function() {
        it('Responds with the deleted service', function(done) {
            request
                .delete(resource + '/' + id + token)
                .expect(200)
                .end(done);
        });
    });

    describe('Create service from OpenAPI', function() {
        it('Rejects Swagger 2', function(done) {
            request
                .post(resource + '/fromSpec' + token)
                .query(oasQuery)
                .attach('spec', swagService)
                .send()
                .expect(400)
                .end(done);
        });

        it('Accepts OpenAPI 3', function(done) {
            request
                .post(resource + '/fromSpec' + token)
                .query(oasQuery)
                .attach('spec', oasService)
                .send()
                .expect(200)
                .expect(function(res) {
                    id = res.body._id;
                })
                .end(done);
        });
    });

    describe('Delete OpenAPI service', function() {
        it('Responds with the deleted service', function(done) {
            request
                .delete(resource + '/' + id + token)
                .expect(200)
                .end(done);
        });
    });

    describe('Create new group', function() {
        it('Responds with the group', function(done) {
            request
                .post('/api/systems')
                .send(mockGroup)
                .expect(200)
                .end(done);
        });
    });  
    
    describe('Retrieve groups', function() {
        it('Responds with the groups', function(done) {
            request
                .get('/api/systems')
                .expect(200)
                .end(done);
        });
    });

    describe('Delete group', function() {
        it('Responds with the deleted system', function(done) {
            request
                .delete('/api/systems/' + mockGroup.name + token)
                .expect(200)
                .end(done);
        });
    });

    describe('Retrieve users', function() {
        it('Responds with the users', function(done) {
            request
                .get('/api/users')
                .expect(200)
                .end(done);
        });
    });

    describe('Delete user', function() {
        it('Responds with the deleted user', function(done) {
            request
                .delete('/api/users/' + mockUser.username + token)
                .expect(200)
                .end(done);
        });
    });
});

