const app = require('../app');
const request = require('supertest').agent(app);
const test = require('./test.js');







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



describe('Report Tests', function() {
    this.timeout(15000);
    describe('Report Tests',function(){
        it('Gets the full report',function(done){
            request
                .get('/api/report')
                .expect(200,done);
        });
    });

    

    
    
});

