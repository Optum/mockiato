const request = require('request');
const debug   = require('debug')('default');

const jmsHost = process.env.MOCKIATOJMS_HOST;
const jmsPort = process.env.MOCKIATOJMS_PORT;

const baseUrl = `http://${jmsHost}:${jmsPort}`;

function getInfo() {
  return new Promise(function(resolve, reject) {
    request(baseUrl + '/env', function(err, res, body) {
      if (err) return reject(err);

      const conf = body['applicationConfig: [classpath:/application-dev.properties]'];

      const mqInfo    = {};
      mqInfo.manager  = conf['mockiato.mq.queueManager'];
      mqInfo.hostname = conf['mockiato.mq.hostname'];
      mqInfo.channel  = conf['mockiato.mq.channel'];
      mqInfo.port     = conf['mockiato.mq.port'];

      mqInfo.queues = {
        1: {
          reqQueue: conf['mockiato.mq.reqQueue.1'],
          resQueue: conf['mockiato.mq.resQueue.1']
        },
        2: {
          reqQueue: conf['mockiato.mq.reqQueue.2'],
          resQueue: conf['mockiato.mq.resQueue.2']
        },
        3: {
          reqQueue: conf['mockiato.mq.reqQueue.3'],
          resQueue: conf['mockiato.mq.resQueue.3']
        }
      };

      return resolve(mqInfo);
    });
  });
}

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
  getInfo: getInfo,
  postPair: postPair
}