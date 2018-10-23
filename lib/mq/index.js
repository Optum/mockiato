const request = require('request');
const debug   = require('debug')('default');

const baseUrl = process.env.MOCKIATOJMS_URL;

function postPair(pair) {
  const opts = {
    url: baseUrl + '/rrpairs',
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
}