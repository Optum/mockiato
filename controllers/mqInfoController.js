const request = require('request');
const debug   = require('debug')('default');
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
  let obj   = JSON.parse(body);
  let query = process.env.MOCKIATO_JMS_QUERY;
  let info  = unflattenObject(obj[query]);

  if (!info || !info.mockiato) {
    return { msg: 'Could not retrieve MQ info' };
  }
  let final = info.mockiato.mq;

  final.defaults = {
    manager: process.env.DEFAULT_QUEUE_MANAGER,
    reqQueue: process.env.DEFAULT_REQUEST_QUEUE
  };

  return final;
}

module.exports = {
  getMQInfo: getMQInfo
};