const request = require('request');
const MQInfo  = require('../models/mq/MQInfo');
const mockiatoJmsUri = process.env.MOCKIATO_JMS_URI;

function getMQInfo(req, res) {
  res.json('STUB');
}

module.exports = {
  getMQInfo: getMQInfo
};