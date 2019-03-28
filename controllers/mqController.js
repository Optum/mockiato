const System  = require('../models/common/System');
const MQService = require('../models/mq/MQService');
const virtual = require('../routes/virtual');
const debug = require('debug')('default');

function registerAllMQServices() {
  System.find({}, function(err, systems) {
    if (err) {
      debug('Error registering MQ services: ' + err);
      return;
    }

    systems.forEach(function(system) {
      registerMQServicesInSystem(system);
    });
  });
}

function registerMQServicesInSystem(sut, exclude) {
  MQService.find({ 'sut.name' : sut.name }, function(err, mqservices) {
    if (err) {
      debug('Error registering MQ services: ' + err);
      return;
    }

    mqservices.forEach(function(mqservice) {
      if (!deepEquals(mqservice, exclude))
        registerMQService(mqservice, sut);
    });
  });
}

function registerMQService(mqserv, sut) {
  if (!sut) {
    System.findOne({ 'name' : mqserv.sut.name }, function(err, system) {
      if (err) {
        debug('Error registering MQ service: ' + err);
        return;
      }

      register(mqserv, system);
    });
  }
  else {
    register(mqserv, sut);
  }

  function register(mqservice, system) {
    if (!mqservice.running || !system || !system.mqInfo) {
      return;
    }

    mqservice.basePath = `/mq/${system.mqInfo.manager}/${system.mqInfo.reqQueue}`;
    
    mqservice.rrpairs.forEach(function(rrpair){
      rrpair.verb = 'POST';
      if (!rrpair.payloadType) rrpair.payloadType = 'XML';

      virtual.registerRRPair(mqservice, rrpair);
    });
  }
}

function deregisterMQService(mqserv) {
  System.findOne({ name: mqserv.sut.name }, function(err, sut) {
    if (err) {
      debug('Error deregistering MQ services: ' + err);
      return;
    }

    if (!sut) {
      return;
    }

    deregisterMQServicesByInfo(sut.mqInfo, reregister);

    function reregister(mqinfo) {
      let q = { 
        '$and': [{
          'mqInfo.manager': mqinfo.manager
        }, {
          'mqInfo.reqQueue': mqinfo.reqQueue
        }]
      }

      System.find(q, function(err, systems) {
        if (err) {
          debug('Error reregistering MQ services: ' + err);
          return;
        }

        systems.forEach(function(system) {
          registerMQServicesInSystem(system, mqserv);
        });
      });
    }
  });
}

function deregisterMQServicesByInfo(mqinfo, cb) {
  if (!mqinfo) {
    return;
  }

  let mqserv = {
    basePath: `/mq/${mqinfo.manager}/${mqinfo.reqQueue}`,
    rrpairs: [{}]
  };
  virtual.deregisterService(mqserv);

  setTimeout(function() {
    cb(mqinfo);
  }, 300);
}

module.exports = {
  registerMQService: registerMQService,
  deregisterMQService: deregisterMQService,
  registerAllMQServices: registerAllMQServices
};