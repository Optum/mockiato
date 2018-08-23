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

// function to check for duplicate service
function searchDuplicate(name, base, next) {
  const query = { 
    name: name,
    basePath: base 
  };

  Service.findOne(query, function(err, duplicate) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    next(duplicate);
  });
}

function addService(req, res) {
  const delay = req.body.delay || 1;
  const name  = req.body.name;
  const base  = '/' + req.body.sut.name + req.body.basePath;

  searchDuplicate(name, base, function(duplicate) {
    if (duplicate) {
      // TODO: handle duplicate service
      handleError('new service is duplicate', res, 400);
    }
    else {
      // call create function for model
      Service.create({
        sut: req.body.sut,
        user: req.decoded,
        name: name,
        type: req.body.type,
        delay: delay,
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
    console.error(e);
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