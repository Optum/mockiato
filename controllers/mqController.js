const System  = require('../models/common/System');
const MQService = require('../models/mq/MQService');
const virtual = require('../routes/virtual');

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

function registerMQServicesInSystem(sut) {
  MQService.find({ 'sut.name' : sut.name }, function(err, mqservices) {
    if (err) {
      debug('Error registering MQ services: ' + err);
      return;
    }

    mqservices.forEach(registerMQService);
  });
}

function registerMQService(mqservice) {
  System.findOne({ 'sut.name': mqservice.sut.name }, function(err, system) {
    if (err) {
      debug('Error registering MQ services: ' + err);
      return;
    }

    if (!mqservice.running || !system.mqInfo) {
      return;
    }

    mqservice.basePath = `/mq/${system.mqInfo.manager}/${system.mqInfo.reqQueue}`;
    
    mqservice.rrpairs.forEach(function(rrpair){
      rrpair.verb = 'POST';
      if (!rrpair.payloadType) rrpair.payloadType = 'XML';
      virtual.registerRRPair(mqservice, rrpair);
    });
  });
}

function deregisterMQService(mqserv) {
  System.findOne({ 'sut.name': mqserv.sut.name }, function(err, sut) {
    if (err) {
      debug('Error deregistering MQ services: ' + err);
      return;
    }

    let toReregister = [];
    System.find({ 'mqInfo' : sut.mqInfo }, function(err, systems) {
      systems.forEach(function(system) {
        MQService.find({ 'sut.name': system.name }, function(err, mqservices) {
          mqservices.forEach(function(mqservice) {
            if (!deepEquals(mqserv, mqservice)) {
              toReregister.push(mqservice);
            }
          });
        });
      });
    });

    deregisterMQServicesByInfo(system.mqInfo);
    toReregister.forEach(registerMQService);
  });
}

function deregisterMQServicesByInfo(mqinfo) {
  if (!mqinfo) {
    return;
  }

  mqserv.basePath = `/mq/${mqinfo.manager}/${mqinfo.reqQueue}`;
  virtual.deregisterService(mqserv);
}

module.exports = {
  registerMQService: registerMQService,
  deregisterMQService: deregisterMQService,
  registerAllMQServices: registerAllMQServices
};