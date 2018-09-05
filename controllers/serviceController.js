const Service = require('../models/Service');
const RRPair  = require('../models/RRPair');
const virtual = require('../routes/virtual');
const removeRoute = require('express-remove-route');
const oas  = require('../lib/openapi/parser');
const wsdl = require('../lib/wsdl/parser');
const fs   = require('fs');
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
      // deregister old req / res pairs
      duplicate.rrpairs.forEach(function(rr){
        removeRoute(require('../app'), '/virtual/' + duplicate.basePath + rr.path);
      });

      // merge services
      mergeRRPairs(duplicate, serv);

      // save merged service
      duplicate.save(function(err, newService) {
        if (err) {
          handleError(err, res, 500);
          return;
        }
  
        try {  
          // register new req / res pairs
          newService.rrpairs.forEach(function(rrpair){
            virtual.registerRRPair(newService, rrpair);
          });
        }
        catch(e) {
          handleError(e.message, res, 400);
          return;
        }

        res.json(newService);
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

        // register SOAP / REST virts
        try {
          service.rrpairs.forEach(function(rrpair){
            virtual.registerRRPair(service, rrpair);
          });
        }
        catch(e) {
          handleError(e.message, res, 400);
          return;
        }

        // respond with the newly created resource
        res.json(service);
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

      // register new SOAP / REST virts
      try {
        // remove old req / res pairs
        service.rrpairs.forEach(function(rr){
          removeRoute(require('../app'), '/virtual/' + service.basePath + rr.path);
        });


        // register new req / res pairs
        newService.rrpairs.forEach(function(rrpair){
          virtual.registerRRPair(newService, rrpair);
        });
      }
      catch(e) {
        handleError(e.message, res, 400);
        return;
      }

      res.json(newService);
    });
  });
}

function toggleService(req, res) {
  Service.findById(req.params.id, function(err, service)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }

    if (service.running) {
      service.rrpairs.forEach(function(rr){
        removeRoute(require('../app'), '/virtual/' + service.basePath + rr.path); // turn off
      });
    }
    else {
      service.rrpairs.forEach(function(rrpair){
        virtual.registerRRPair(service, rrpair); // turn on
      });
    }

    // flip the bit & save in DB
    service.running = !service.running;
    service.save(function(e, newService) {
      if (e)	{
        handleError(e, res, 500);
        return;
      }

      res.json({'message': 'toggled', 'service': newService });
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

    // deregister SOAP / REST endpoints
    service.rrpairs.forEach(function(rr){
      removeRoute(require('../app'), '/virtual/' + service.basePath + rr.path);
    });

    res.json({'message' : 'deleted', 'service' : service});
  });
}

function createFromSpec(req, res) {
  const type = req.query.type;
  const base = req.query.base;
  const sut  = { name: req.query.group };

  const filename = req.file.path;
  const specStr  = fs.readFileSync(filename);

  let servicePromise;
  switch(type) {
    case 'wsdl':
      servicePromise = createFromWSDL(filename);
      break;
    case 'openapi':
      servicePromise = createFromOpenAPI(JSON.parse(specStr));
      break;
    default:
      handleError(`API specification type ${type} is not supported`, res, 400);
  }

  servicePromise
    .then(function(serv) {
      // set group, basePath, and owner
      serv.sut = sut;
      serv.basePath = '/' + serv.sut.name + base;
      serv.user = req.decoded;

      // save the service
      Service.create(serv, function(err, service) {
        if (err) handleError(err, res, 500);
        service.rrpairs.forEach(function(rrpair){
          virtual.registerRRPair(service, rrpair);
        });

        res.json(service);
      });
    })
    .catch(function(err) {
      debug(err);
      handleError(err, res, 400);
    });
}

function createFromWSDL(file) {
  return wsdl.parse(file);
}

function createFromOpenAPI(spec) {
  return new Promise(function(resolve, reject) {
    resolve(oas.parse(spec));
  });
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
  createFromSpec: createFromSpec
};