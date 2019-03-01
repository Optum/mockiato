const request = require('request');
const MQInfo  = require('../models/mq/MQInfo');
const debug = require('debug')('default');
const mockiatoJmsUri = process.env.MOCKIATO_JMS_URI;

function getMQInfo(req, res) {
  if (!mockiatoJmsUri) {
    debug('MOCKIATO_JMS_URI not set');
    handleError('Could not retrieve MQ info', res, 500);
    return;
  }

  request(mockiatoJmsUri + '/env', function(err, resp, body) {
    if (err) {
      debug(err);
      handleError('Could not retrieve MQ info', res, 500);
      return;
    }

    let data = parseInfo(body);
    
    res.json(data);
  });
}

function parseInfo(body) {
  let data  = JSON.parse(body);
  let info  = data['applicationConfig: [classpath:/application.yml]'];
  let final = unflattenObject(info);

  return final.mockiato.mq;
}

module.exports = {
  getMQInfo: getMQInfo
};