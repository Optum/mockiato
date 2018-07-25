const Stomp = require('stomp-client');

const mqHost = process.env.MQ_HOST;
const mqPort = process.env.MQ_PORT;
const mqUser = process.env.MQ_USER;
const mqPass = process.env.MQ_PASS;

const Consumer = function() {
  this._stompClient = null;
};

Consumer.prototype.init = function(callback) {
  this._stompClient = new Stomp(mqHost, mqPort, mqUser, mqPass);

  this._stompClient.on('error', function() {
    console.error('Error connecting to message broker');
  });

  this._stompClient.connect(function(sessionId) {
    console.log('Consumer connected to message broker with session ID: ' + sessionId);
    callback();
  });
};

Consumer.prototype.subscribe = function(queue, callback) {
  this._stompClient.subscribe(queue, callback);
};

module.exports = Consumer;
