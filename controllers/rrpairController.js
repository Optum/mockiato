const RRPair = require('../models/http/RRPair');
const MQPair = require('../models/mq/MQPair');

const Service = require('../models/http/Service');
const MQService = require('../models/mq/MQService');

const xml2js = require('xml2js');
const xmlBuilder = new xml2js.Builder();

function getPairsByServiceId(req, res) {
  Service.findById(req.params.serviceId, function(err, service)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      if (service) {
        res.json(service.rrpairs);
      }
      else {
        MQService.findById(req.params.serviceId, function(error, mqService) {
          if (error)	{
            handleError(error, res, 500);
            return;
          }

          return res.json(mqService.rrpairs);
        });
      }
  });
}

function trimRequestData(template, rrpair) {
  if (!template || !rrpair) {
    return;
  }

  let isXML = flase;
  
  if (rrpair.payloadType === 'XML') {
    isXML = true;
    xml2js.parseString(template, function(err, xmlTemplate) {
      if (err) {
        debug(err);
        return;
      }
      template = xmlTemplate;
    });
  }
  else if (rrpair.payloadType === 'JSON') {
    try {
      template = JSON.parse(template);
    }
    catch(e) {
      debug(e);
      return;
    }
  }

  // flatten request data
  const flatTemplate = flattenObject(template);
  const flatReqData  = flattenObject(reqData);
  const trimmedReqData = {};
    
  // pull out the fields specified in the template
  for (let field in flatTemplate) {
    trimmedReqData[field] = flatReqData[field];
  }

  // unflatten the trimmed request data
  const unflatReqData = unflattenObject(trimmedReqData);

  if (isXML) {
    return xmlBuilder.buildObject(unflatReqData);
  }

  return unflatReqData;
}

module.exports = {
  getPairsByServiceId: getPairsByServiceId,
  trimRequestData: trimRequestData
};
