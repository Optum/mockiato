const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const virtual = require('./virtual');
const mq  = require('../lib/mq/virtual-mq');
const removeRoute = require('express-remove-route');
const jwt = require('jsonwebtoken');
const swag = require('../lib/openapi/parser');

// middleware for token auth
router.use(function(req, res, next) {
  res.set('Content-Type', 'application/json');
  if (req.method === 'GET') return next();

  const token = req.query.token || req.headers['x-access-token'];
  if (token) {
    // verify secret and check expiry
    jwt.verify(token, require('../app').get('secret'), function(err, decoded) {
      if (err) {
        return res.status(403).json({
            success: false,
            message: 'Failed to authenticate token'
        });
      } else {
        // save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  }
  else {
    return res.status(401).json({
        success: false,
        message: 'No token provided.'
    });
  }
});

router.post('/openapi', function(req, res) {
  let serv;
  const spec = req.body;

  try {
    serv = swag.parse(spec);

    serv.sut = { name: 'OAS3' };
    serv.basePath = '/' + serv.sut.name + serv.basePath;
    serv.user = req.decoded;
    mongoose.model('Service').create(serv, function(err, service) {
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
});

// add a new virtual service
router.post('/',
  function(req, res) {
      function createService() {
        const base = '/' + req.body.sut.name + req.body.basePath;

        // call create function for db
        mongoose.model('Service').create({
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
      createService();
});

// retrieve a virtual service by ID (in JSON)
router.get('/:id',
	function(req, res) {

	  // call find by id function for db
	  mongoose.model('Service').findById(req.params.id, function(err, service)	{
	    	if (err)	{
	    		handleError(err, res, 500);
	    		return;
	    	}

	    	res.json(service);
	  });
});

// retrieve services with query string filters
router.get('/',
	function(req, res) {

    const query = {
        'sut.name': req.query.sut,
        'user.uid': req.query.user
    };

	  // call find function with queries
	  mongoose.model('Service').find(query, function(err, services)	{
	    	if (err)	{
	    		handleError(err, res, 500);
	    		return;
	    	}

	    	res.json(services);
	  });
});

// retrieve services by SUT
router.get('/sut/:name',
  function(req, res) {

    mongoose.model('Service').find({ 'sut.name': req.params.name }, function(err, services) {
      if (err) {
        handleError(err, res, 500);
	    	return;
      }

      res.json(services);
    });
  });

// retrieve services by user
router.get('/user/:uid',
  function(req, res) {

    mongoose.model('Service').find({ 'user.uid': req.params.uid }, function(err, services) {
      if (err) {
        handleError(err, res, 500);
	    	return;
      }

      res.json(services);
    });
  });

// update a virtual service by ID
router.put('/:id',
  function(req, res) {

    // find service by ID and update
    mongoose.model('Service').findById(req.params.id, function (err, service) {
      if (err) {
        handleError(err, res, 400);
        return;
      }

      function updateService() {
        // don't let consumer alter base path or service type
        service.name = req.body.name;
        service.delay = req.body.delay;        
        service.rrpairs = req.body.rrpairs;

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
      }

      updateService();
    });
});

// delete a virtual service by ID
router.delete('/:id',
	function(req, res) {

 		// call find and remove function for db
	  mongoose.model('Service').findOneAndRemove({_id : req.params.id }, function(err, service)	{
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
});

// toggle a service on / off TODO: toggle MQ services
router.post('/:id/toggle',
  function(req, res) {

    mongoose.model('Service').findById(req.params.id, function(err, service)	{
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
});

// sends error in JSON format with the provided HTTP status code
function handleError(e, res, stat) {
  res
    .status(stat)
    .json({ error: e });

  console.error(e);
}

module.exports = router;
