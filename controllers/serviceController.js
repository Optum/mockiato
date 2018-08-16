const Service = require('../models/Service');
const virtual = require('../routes/virtual');
const mq  = require('../lib/mq');
const removeRoute = require('express-remove-route');
const swag = require('../lib/openapi/parser');

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

function addService(req, res) {
  const base = '/' + req.body.sut.name + req.body.basePath;

  // call create function for db
  Service.create({
    sut: req.body.sut,
    user: req.decoded,
    name: req.body.name,
    type: req.body.type,
    basePath: base,
    rrpairs: req.body.rrpairs
  },

  // handler for db call
  function(err, service) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    if (service.type !== 'MQ') {
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
    }
    else {
      // register MQ virts
      service.rrpairs.forEach(function(rrpair){
        mq.register(rrpair);
      });
    }

    // respond with the newly created resource
    res.json(service);
  });
}

function updateService(req, res) {
  // find service by ID and update
  Service.findById(req.params.id, function (err, service) {
    if (err) {
      handleError(err, res, 400);
      return;
    }

    // don't let consumer alter base path or service type
    service.name = req.body.name;
    service.rrpairs = req.body.rrpairs;
    if (req.body.delay) service.delay = req.body.delay;

    // save updated service in DB
    service.save(function (err, newService) {
      if (err) {
        handleError(err, res, 500);
        return;
      }

      if (service.type !== 'MQ') {
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
      }
      else {
        // register new MQ virts TODO: deregister old MQ services
        newService.rrpairs.forEach(function(rrpair){
          mq.register(rrpair);
        });
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
    if (service.type !== 'MQ') {
      service.rrpairs.forEach(function(rr){
        removeRoute(require('../app'), '/virtual/' + service.basePath + rr.path);
      });
    }
    // TODO: deregister MQ services

    res.json({'message' : 'deleted', 'service' : service});
  });
}

function createFromSpec(req, res) {
  const type = req.query.type;
  const spec = req.file;

  switch(type) {
    case 'swagger':
      res.json(createFromSwagger(spec));
      break;
    case 'openapi':
      res.json(createFromOpenAPI(spec));
      break;
    case 'wadl':
      res.json(createFromWADL(spec));
      break;
    case 'wsdl':
      res.json(createFromWSDL(spec));
      break;
    default:
      break;
  }
}

function createFromSwagger(spec) {
  let serv;

  try {
    // TODO: parse
    return serv;
  }
  catch(e) {
    console.error(e);
    return;
  }
}

function createFromWADL(spec) {
  let serv;

  try {
    // TODO: parse
    return serv;
  }
  catch(e) {
    console.error(e);
    return;
  }
}

function createFromWSDL(spec) {
  let serv;

  try {
    // TODO: parse
    return serv;
  }
  catch(e) {
    console.error(e);
    return;
  }
}

function createFromOpenAPI(spec) {
  let serv;

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

      return service;
    });
  }
  catch(e) {
    console.error(e);
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
  createFromSpec: createFromSpec
};