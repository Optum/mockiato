const Stomp = require('stomp-client');

const mqHost = process.env.MQ_HOST;
const mqPort = process.env.MQ_PORT;
const mqUser = process.env.MQ_USER;
const mqPass = process.env.MQ_PASS;

const Producer = function() {
  this._stompClient = null;
};

Producer.prototype.init = function(callback) {
  this._stompClient = new Stomp(mqHost, mqPort, mqUser, mqPass);

  this._stompClient.on('error', function() {
    console.error('Error connecting to message broker');
  });
  
  this._stompClient.connect(function(sessionId){
    console.log('Producer connected to message broker with session ID: ' + sessionId);
    callback();
  });
};

Producer.prototype.postMessage = function(queue, message) {
  console.log('Posting message to response queue');
  this._stompClient.publish(queue, message);
};

module.exports = Producer;
