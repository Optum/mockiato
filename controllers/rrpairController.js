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

module.exports = {
  getPairsByServiceId: getPairsByServiceId
};
