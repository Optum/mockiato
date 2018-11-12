const request = require('request');
const debug   = require('debug')('default');

const jmsHost = process.env.MOCKIATOJMS_HOST;
const jmsPort = process.env.MOCKIATOJMS_PORT;

const baseUrl = `http://${jmsHost}:${jmsPort}`;

function postPair(rrpair) {
  const pair = {
    queueNum: 1,
    reqData:  rrpair.reqData,
    resData:  rrpair.resData
  };

  const opts = {
    url:  baseUrl + '/rrpairs',
    body: pair,
    json: true
  };

  request.post(opts, function(err, res, body) {
    if (err) {
      debug('Error: ' + err);
      return;
    }

    debug('Response: ' + res);
    debug('Body: ' + body);
  });
}

module.exports = {
  postPair: postPair
};