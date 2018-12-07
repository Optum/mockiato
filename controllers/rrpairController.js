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
  
  xml2js.parseString(template, function(err, xmlTemplate) {
    if (err) {
      debug(err);
      return;
    }
    template = xmlTemplate;
  });

  let reqData;
  xml2js.parseString(rrpair.reqData, function(err, data) {
    reqData = data;
  });

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

  return xmlBuilder.buildObject(unflatReqData);
}

module.exports = {
  getPairsByServiceId: getPairsByServiceId,
  trimRequestData: trimRequestData
};
