const xml2js = require('xml2js');
const mongoose = require('mongoose');

const Consumer = require('./consumer');
const Producer = require('./producer');

const consumer = new Consumer();
const producer = new Producer();

const reqQueue = '/queue/orders.request';
const resQueue = '/queue/orders.response';

function connect() {
  producer.init(function(){
    consumer.init(function() {
      console.log('MQ initialized');
    });
  });
}

function register(rrpair) {
  // listen on request queue
  consumer.subscribe(reqQueue, function(body, headers) {
    console.log("Received message on request queue");

    let message;
    let reqData;
    if (rrpair.payloadType === 'XML') {
      // convert message and request data xml to JS objects for comparison
      xml2js.parseString(body, {'async': false}, function(err, data) {
        message = data;
      });
      xml2js.parseString(rrpair.reqData, {'async': false}, function(err, data) {
        reqData = data;
      });
    }
    else {
      message = body;
      reqData = rrpair.reqData;
    }

    // if request matches TODO: what if message is plain text?
    if (compareObjects(message, reqData)) {
      // post message to response queue
      producer.postMessage(resQueue, rrpair.resData);
    }
  });
}

// register all RR pairs for all MQ services from db
function registerAll() {
  mongoose.model('Service').find({ type:'MQ' }, function(err, services) {
    if (err) {
      console.error('Error registering services: ' + err);
      return;
    }

    try {
      services.forEach(function(service){
        service.rrpairs.forEach(function(rrpair){
          register(rrpair);
        });
      });
    }
    catch(e) {
      console.error('Error registering services: ' + e);
    }
  });
}

function compareObjects(obj1, obj2) {
  // sort keys so order doesn't impact matching
  const keysVals1 = Object.entries(obj1).sort();
  const keysVals2 = Object.entries(obj2).sort();
  return (JSON.stringify(keysVals1) === JSON.stringify(keysVals2));
}

module.exports = {
  connect: connect,
  register: register,
  registerAll: registerAll
};
