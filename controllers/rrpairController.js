const RRPair = require('../models/http/RRPair');
const Service = require('../models/http/Service');

function getPairsByServiceId(req, res) {
  Service.findById(req.params.serviceId, function(err, service)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(service.rrpairs);
  });
}

module.exports = {
  getPairsByServiceId: getPairsByServiceId
};
