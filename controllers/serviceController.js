const Service = require('../models/http/Service');
const MQService = require('../models/mq/MQService');
const RRPair  = require('../models/http/RRPair');

const virtual = require('../routes/virtual');
const manager = require('../lib/pm2/manager');
const debug = require('debug')('default');
const oas  = require('../lib/openapi/parser');
const wsdl = require('../lib/wsdl/parser');
const request = require('request');
const fs   = require('fs');
const YAML = require('yamljs');

function getServiceById(req, res) {
  // call find by id function for db
  Service.findById(req.params.id, function(err, service)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      if (service) {
        return res.json(service);
      }
      else {
        MQService.findById(req.params.id, function(error, mqService) {
          if (error)	{
            handleError(error, res, 500);
            return;
          }

          return res.json(mqService);
        });
      }
  });
}

function getServicesByUser(req, res) {
  let allServices = [];

  const query = { 'user.uid': req.params.uid };

  Service.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    allServices = services;

    MQService.find(query, function(error, mqServices) {
      if (error)	{
        handleError(error, res, 500);
        return;
      }

      if (mqServices.length) {
        allServices = allServices.concat(mqServices);
      }

      return res.json(allServices);
    });
  });
}

function getServicesBySystem(req, res) {
  let allServices = [];

  const query = { 'sut.name': req.params.name };

  Service.find(query, function(err, services) {
    if (err) {
      handleError(err, res, 500);
      return;
    }

    allServices = services;

    MQService.find(query, function(error, mqServices) {
      if (error)	{
        handleError(error, res, 500);
        return;
      }

      if (mqServices.length) {
        allServices = allServices.concat(mqServices);
      }

      return res.json(allServices);
    });
  });
}

function getServicesByQuery(req, res) {
  const query = {};

  const sut  = req.query.sut;
  const user = req.query.user;

  if (sut) query['sut.name']  = sut;
  if (user) query['user.uid'] = user;

  // call find function with queries
  let allServices = [];
  Service.find(query, function(err, services)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      allServices = services;

      MQService.find(query, function(error, mqServices) {
        if (error)	{
          handleError(error, res, 500);
          return;
        }
  
        if (mqServices.length) {
          allServices = allServices.concat(mqServices);
        }

        return res.json(allServices);
      });
  });
}

// function to check for duplicate service & twoSeviceDiffNameSameBasePath
function searchDuplicate(service, next) {
  const query2ServDiffNmSmBP = {
    name: { $ne: service.name },
    basePath: service.basePath
  };

  const query = {
    name: service.name,
    basePath: service.basePath
  };
  
  Service.findOne(query2ServDiffNmSmBP, function(err, sameNmDupBP) {
    if (err) {
      handleError(err, res, 500);
      return;
    }
    else if (sameNmDupBP)
      next({ twoServDiffNmSmBP: true });
    else {
      Service.findOne(query, function (err, duplicate) {
        if (err) {
          handleError(err, res, 500);
          return;
        }
        next(duplicate);
      });
    }
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
function syncWorkers(serviceId, action) {
  const msg = {
    action: action,
    serviceId: serviceId
  };
  
  manager.messageAll(msg)
    .then(function(workerIds) {
      if (workerIds.length) debug(workerIds);
      if (action === 'register') {
        virtual.registerById(serviceId);
      }
      else {
        virtual.deregisterById(serviceId);
        Service.findOneAndRemove({_id : serviceId }, function(err, service)	{
          if (err) debug(err);
          debug(service);
          
          if (!service) {
            MQService.findOneAndRemove({ _id: serviceId }, function(error, mqService) {
              if (error) debug(error);
              debug(mqService);
            });
          }
        });
      }
    })
    .catch(function(err) {
      debug(err);
    });
}

function addService(req, res) {
  const type = req.body.type;

  let serv  = {
    sut: req.body.sut,
    user: req.decoded,
    name: req.body.name,
    type: req.body.type,
    matchTemplates: req.body.matchTemplates,
    rrpairs: req.body.rrpairs
  };

  if (type === 'MQ') {
    serv.connInfo = req.body.connInfo;

    MQService.create(serv,
      // handler for db call
      function(err, service) {
        if (err) {
          handleError(err, res, 500);
          return;
        }
        // respond with the newly created resource
        res.json(service);
    });
  }
  else {
    serv.delay = req.body.delay;
    serv.basePath =  '/' + req.body.sut.name + req.body.basePath;

    searchDuplicate(serv, function(duplicate) {
      if (duplicate && duplicate.twoServDiffNmSmBP){
        res.json({"error":"twoSeviceDiffNameSameBasePath"});
        return;
      }
      else if (duplicate) { 
        // merge services
        mergeRRPairs(duplicate, serv);
        // save merged service
        duplicate.save(function(err, newService) {
          if (err) {
            handleError(err, res, 500);
            return;
          }
          res.json(newService);
          
          syncWorkers(newService._id, 'register');
        });
      }
      else {
        Service.create(serv,
        function(err, service) {
          if (err) {
            handleError(err, res, 500);
            return;
          }
          res.json(service);
  
          syncWorkers(service._id, 'register');
        });
      }
    });
  }
}

function updateService(req, res) {
  const type = req.body.type;
  const BaseService = (type === 'MQ') ? MQService : Service;

  console.log(type);
  console.log(BaseService);

  // find service by ID and update
  BaseService.findById(req.params.id, function (err, service) {
    if (err) {
      handleError(err, res, 400);
      return;
    }

    // don't let consumer alter name, base path, etc.
    service.matchTemplates = req.body.matchTemplates;
    service.rrpairs = req.body.rrpairs;

    if (service.type !== 'MQ') {
      const delay = req.body.delay;
      if (delay || delay === 0) {
        service.delay = delay;
      }
    }
    
    // save updated service in DB
    service.save(function (err, newService) {
      if (err) {
        handleError(err, res, 500);
        return;
      }

      res.json(newService);
      
      if (service.type !== 'MQ') {
        syncWorkers(newService._id, 'register');
      }
    });
  });
}

function toggleService(req, res) {
  Service.findById(req.params.id, function(err, service)	{
    if (err)	{
      handleError(err, res, 500);
      return;
    }

    if (service) {
      // flip the bit & save in DB
      service.running = !service.running;
      service.save(function(e, newService) {
        if (e)	{
          handleError(e, res, 500);
          return;
        }

        res.json({'message': 'toggled', 'service': newService });
        syncWorkers(newService._id, 'register');
      });
    }
    else {
      MQService.findById(req.params.id, function(error, mqService) {
        if (error)	{
          handleError(error, res, 500);
          return;
        }

        mqService.running = !mqService.running;
        mqService.save(function(e2, mqService) {
          if (e2)	{
            handleError(e2, res, 500);
            return;
          }

          res.json({'message': 'toggled', 'service': mqService });
        });
      });
    }
  });
}

function deleteService(req, res) {
  res.json({ 'message' : 'deleted', 'id' : req.params.id });
  syncWorkers(req.params.id, 'delete');
}

// get spec from url or local filesystem path
function getSpecString(path) {
  return new Promise(function(resolve, reject) {
    if (path.includes('http')) {
      request(path, function(err, resp, data) {
        if (err) return reject(err);
        return resolve(data);
      });
    }
    else {
      fs.readFile(path, 'utf8', function(err, data) {
        if (err) return reject(err);
        return resolve(data);
      });
    }
  });
  
}

function isYaml(req) {
  const url = req.query.url;
  if (url) {
    if (url.includes('yml') || url.includes('yaml'))
      return true;
  }
  if (req.file) {
    const name = req.file.originalname;
    if (name.includes('yml') || name.includes('yaml')) {
      return true;
    }
  }
  return false;
}

function createFromSpec(req, res) {
  const type = req.query.type;
  const name = req.query.name;
  const url  = req.query.url;
  const sut  = { name: req.query.group };
  const specPath = url || req.file.path;

  switch(type) {
    case 'wsdl':
      createFromWSDL(specPath).then(onSuccess).catch(onError);
      break;
    case 'openapi':
      const specPromise  = getSpecString(specPath);
      specPromise.then(function(specStr) {
        let spec;
        try {
          if (isYaml(req)) {
            spec = YAML.parse(specStr);
          }
          else {
            spec = JSON.parse(specStr);
          }
        }
        catch(e) {
          debug(e);
          return handleError('Error parsing OpenAPI spec', res, 400);
        }

        createFromOpenAPI(spec).then(onSuccess).catch(onError);

        }).catch(onError);
      break;
    default:
      return handleError(`API specification type ${type} is not supported`, res, 400);
  }

  function onSuccess(serv) {
    // set group, basePath, and owner
    serv.sut = sut;
    serv.name = name;
    serv.basePath = '/' + serv.sut.name + serv.basePath;
    serv.user = req.decoded;

    // save the service
    Service.create(serv, function(err, service) {
      if (err) handleError(err, res, 500);

      res.json(service);
      syncWorkers(service._id, 'register');
    });
  }

  function onError(err) {
    debug(err);
    handleError(err, res, 400);
  }
}

function createFromWSDL(file) {
  return wsdl.parse(file);
}

function createFromOpenAPI(spec) {
  return oas.parse(spec);
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