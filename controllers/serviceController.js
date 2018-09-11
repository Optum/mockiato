const Service = require('../models/Service');
const RRPair  = require('../models/RRPair');
const virtual = require('../routes/virtual');
const manager = require('../lib/pm2/manager');
const swag = require('../lib/openapi/parser');
const debug  = require('debug')('default');

function getServiceById(req, res) {
  // call find by id function for db
  Service.findById(req.params.id, function(err, service)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(service);
  });
}

function getServicesByUser(req, res) {
  Service.find({ 'user.uid': req.params.uid }, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    res.json(services);
  });
}

function getServicesBySystem(req, res) {
  Service.find({ 'sut.name': req.params.name }, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    res.json(services);
  });
}

function getServicesByQuery(req, res) {
  const query = {
      'sut.name': req.query.sut,
      'user.uid': req.query.user
  };

  // call find function with queries
  Service.find(query, function(err, services)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(services);
  });
}

// function to check for duplicate service
function searchDuplicate(service, next) {
  const query = { 
    name: service.name,
    basePath: service.basePath
  };

  Service.findOne(query, function(err, duplicate) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    next(duplicate);
  });
}

// returns a stripped-down version on the rrpair for logical comparison
function stripRRPair(rrpair) {
  return {
    verb: rrpair.verb || '',
    path: rrpair.path || '',
    payloadType: rrpair.payloadType || '',
    queries: rrpair.queries || {},
    reqHeaders: rrpair.reqHeaders || {},
    reqData: rrpair.reqData || {},
    resStatus: rrpair.resStatus || 200,
    resHeaders: rrpair.resHeaders || {},
    resData: rrpair.resData || {}
  };
}

// function to merge req / res pairs of duplicate services
function mergeRRPairs(original, second) {
  for (let rrpair2 of second.rrpairs) {
    let hasAlready = false;
    let rr2 = stripRRPair(new RRPair(rrpair2));

    for (let rrpair1 of original.rrpairs) {
      let rr1 = stripRRPair(rrpair1);

      if (deepEquals(rr1, rr2)) { 
        hasAlready = true;
        break;
      }
    }

    // only add RR pairs that original doesn't have already
    if (!hasAlready) {
      original.rrpairs.push(rrpair2);
    }
  }
}

// propagate changes to all threads
function syncWorkers(serviceId) {
  manager.getWorkerIds()
    .then(function(workerIds) {
      manager.messageAll(serviceId, workerIds);
    })
    .catch(function(err) {
      debug(err);
    });
}

function addService(req, res) {
  let serv  = {
    sut: req.body.sut,
    user: req.decoded,
    name: req.body.name,
    type: req.body.type,
    delay: req.body.delay,
    basePath: '/' + req.body.sut.name + req.body.basePath,
    rrpairs: req.body.rrpairs
  };

  searchDuplicate(serv, function(duplicate) {
    if (duplicate) {
      // merge services
      mergeRRPairs(duplicate, serv);

      // save merged service
      duplicate.save(function(err, newService) {
        if (err) {
          handleError(err, res, 500);
          return;
        }

        res.json(newService);
        syncWorkers(newService._id);
      });
    }
    else {
      Service.create(serv,

      // handler for db call
      function(err, service) {
        if (err) {
          handleError(err, res, 500);
          return;
        }

        // respond with the newly created resource
        res.json(service);
        syncWorkers(service._id);
      });
    }
  });
}

function updateService(req, res) {
  // find service by ID and update
  Service.findById(req.params.id, function (err, service) {
    if (err) {
      handleError(err, res, 400);
      return;
    }

    // don't let consumer alter name, base path, etc.
    mergeRRPairs(service, req.body);
    if (req.body.delay) service.delay = req.body.delay;

    // save updated service in DB
    service.save(function (err, newService) {
      if (err) {
        handleError(err, res, 500);
        return;
      }

      res.json(newService);
      syncWorkers(newService._id);
    });
  });
}

function toggleService(req, res) {
  Service.findById(req.params.id, function(err, service)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }

    // flip the bit & save in DB
    service.running = !service.running;
    service.save(function(e, newService) {
      if (e)	{
        handleError(e, res, 500);
        return;
      }

      res.json({'message': 'toggled', 'service': newService });
      syncWorkers(newService._id);
    });
  });
}

function deleteService(req, res) {
  // call find and remove function for db
  Service.findOneAndRemove({_id : req.params.id }, function(err, service)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }

    res.json({'message' : 'deleted', 'service' : service});
    syncWorkers(newService._id);
  });
}

function createFromOpenAPI(req, res) {
  let serv;
  const spec = req.body;

  try {
    serv = swag.parse(spec);

    serv.sut = { name: 'OAS3' };
    serv.basePath = '/' + serv.sut.name + serv.basePath;
    serv.user = req.decoded;
    Service.create(serv, function(err, service) {
      try {
        service.rrpairs.forEach(function(rrpair){
          virtual.registerRRPair(service, rrpair);
        });
      }
      catch(e) {
        handleError(e.message, res, 400);
        return;
      }

      res.json(service);
    });
  }
  catch(e) {
    debug(e);
    handleError(e, res, 400);
    return;
  }
}

module.exports = {
  getServiceById: getServiceById,
  getServicesByUser: getServicesByUser,
  getServicesBySystem: getServicesBySystem,
  getServicesByQuery: getServicesByQuery,
  addService: addService,
  updateService: updateService,
  toggleService: toggleService,
  deleteService: deleteService,
  createFromOpenAPI: createFromOpenAPI
}