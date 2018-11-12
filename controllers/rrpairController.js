const RRPair = require('../models/RRPair');
const Service = require('../models/Service');

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
