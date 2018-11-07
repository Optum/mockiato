const express = require('express');
const router = express.Router();
const xml2js = require('xml2js');
const pause = require('connect-pause');
const debug = require('debug')('matching');
const Service = require('../models/Service');
const removeRoute = require('../lib/remove-route');
const mq = require('../lib/mq');

// function to simulate latency
function delay(ms) {
  if (!ms || ms === 1) {
    return function(req, res, next) {
      return next();
    };
  }
  return pause(ms);
}

// function for registering an RR pair on a service
function registerRRPair(service, rrpair) {
  let path;
  let matched;

  if (rrpair.path) path = service.basePath + rrpair.path;
  else path = service.basePath;

  router.all(path, delay(service.delay), function(req, resp, next) {
    if (req.method === rrpair.verb) {
      // convert xml to js object
      if (rrpair.payloadType === 'XML') {
        xml2js.parseString(req.body, function(err, xmlReq) {
          matched = matchRequest(xmlReq);
        });
      }
      else {
        matched = matchRequest(req.body);
      }
    }
    else {
      debug("HTTP methods don't match");
      return next();
    }
    debug("Request matched? " + matched);
    
    // run the next callback if request not matched
    if (!matched) return next();

    // function for matching requests to responses
    function matchRequest(payload) {
      let reqData;
      let match = false;

      if (rrpair.reqData) {
        if (rrpair.payloadType === 'XML') {
          xml2js.parseString(rrpair.reqData, function(err, data) {
            reqData = data;
          });
        }
        else {
          reqData = rrpair.reqData;
        }
      }

      // try exact math
      match = deepEquals(payload, reqData);

      if (!match) {
        // match based on template
        let templates = service.matchTemplates;

        if (templates && templates.length) {
          for (let template of templates) {
            if (!template) {
              break;
            }
            
            if (rrpair.payloadType === 'XML') {
              xml2js.parseString(template, function(err, xmlTemplate) {
                if (err) {
                  debug(err);
                  return;
                }
                template = xmlTemplate;
              });
            }
            else if (rrpair.payloadType === 'JSON') {
              try {
                template = JSON.parse(template);
              }
              catch(e) {
                debug(e);
                continue;
              }
            }
    
            const flatTemplate = flattenObject(template);
            const flatPayload  = flattenObject(payload);
            const flatReqData  = flattenObject(reqData);
    
            const trimmedPayload = {}; const trimmedReqData = {};
              
            for (let field in flatTemplate) {
              trimmedPayload[field] = flatPayload[field];
              trimmedReqData[field] = flatReqData[field];
            }
            
            debug('received payload (from template): ' + JSON.stringify(trimmedPayload, null, 2));
            debug('expected payload (from template): ' + JSON.stringify(trimmedReqData, null, 2));
            
            match = deepEquals(trimmedPayload, trimmedReqData);
            
            if (match) break;
          }
        }
      }

      if (!rrpair.reqData || match) {
        // check request queries
        if (rrpair.queries) {
          // try the next rr pair if no queries were sent
          if (!req.query) {
            debug("expected query in request");
            return false;
          }

          // try the next rr pair if queries do not match
          if (!deepEquals(rrpair.queries, req.query)) {
            debug("expected query: " + JSON.stringify(rrpair.queries));
            debug("received query: " + JSON.stringify(req.query));
            return false;
          }
        }

        // check request headers
        if (rrpair.reqHeaders) {
          let matchedHeaders = true;
          const expectedHeaders = Object.entries(rrpair.reqHeaders);

          expectedHeaders.forEach(function(keyVal) {
            // skip content-type header
            if (keyVal[0].toLowerCase() !== 'content-type') {
              const sentVal = req.get(keyVal[0]);
              if (sentVal !== keyVal[1]) {
                // try the next rr pair if headers do not match
                matchedHeaders = false;
                debug('expected header: ' + keyVal[0] + ': ' + keyVal[1]);
                debug('received header: ' + keyVal[0] + ': ' + sentVal);
              }
            }
          });

          if (!matchedHeaders) return false;
        }

        // send matched data back to client
        setRespHeaders();
        if (rrpair.resStatus && rrpair.resData) {
          resp.status(rrpair.resStatus).send(rrpair.resData);
        }
        else if (!rrpair.resStatus && rrpair.resData) {
          resp.send(rrpair.resData);
        }
        else if (rrpair.resStatus && !rrpair.resData) {
          resp.sendStatus(rrpair.resStatus);
        }
        else {
          resp.sendStatus(200);
        }

        // request was matched
        return true;
      }

      // request was not matched
      debug("expected payload: " + JSON.stringify(reqData, null, 2));
      debug("received payload: " + JSON.stringify(payload, null, 2));
      return false;
    }

    // function to set headers for response
    function setRespHeaders() {
      const resHeaders = rrpair.resHeaders;

      if (!resHeaders) {
        // set default headers
        if (rrpair.payloadType === 'XML')
          resp.set("Content-Type", "text/xml");
        else if (rrpair.payloadType === 'JSON') {
          resp.set("Content-Type", "application/json");
        }
        else {
          resp.set("Content-Type", "text/plain");
        }
      }
      else {
        resp.set(resHeaders);
      }
    }
  });
}

// register all RR pairs for all SOAP / REST services from db
function registerAllRRPairsForAllServices() {
  Service.find({ $or: [{ type:'SOAP' }, { type:'REST' }] }, function(err, services) {
    if (err) {
      debug('Error registering services: ' + err);
      return;
    }

    try {
      services.forEach(function(service){
        if (service.running) {
          service.rrpairs.forEach(function(rrpair){
            registerRRPair(service, rrpair);
          });
        }
      });
    }
    catch(e) {
      debug('Error registering services: ' + e);
    }
  });
}

// retrieve service from database and register it
function registerById(id) {
  Service.findById(id, function(err, service) {
    if (err) {
      debug('Error registering service: ' + err);
      return;
    }

    if (service) {
      try {
        deregisterService(service);
  
        debug('service running: ' + service.running);
        if (service.running) {
          service.rrpairs.forEach(function(rrpair){
            registerRRPair(service, rrpair);
          });
        }
      }
      catch(e) {
        debug('Error registering service: ' + e);
      }
    }
  });
}

function deregisterService(service) {
  service.rrpairs.forEach(function(rr){
    let relPath = rr.path || '';
    let fullPath = '/virtual' + service.basePath + relPath;
    removeRoute(require('../app'), fullPath);
  });
}

function deregisterById(id) {
  Service.findById(id, function(err, service) {
    if (err) {
      debug('Error deregistering service: ' + err);
      return;
    }

    if (service) {
      try {
        deregisterService(service);
      }
      catch(e) {
        debug('Error deregistering service: ' + e);
      }
    }
  });
}

function registerMQPairs(service) {
  service.rrpairs.forEach(function(rrpair){
    mq.postPair(rrpair);
  });
}

module.exports = {
  router: router,
  registerById: registerById,
  registerRRPair: registerRRPair,
  deregisterById: deregisterById,
  deregisterService: deregisterService,
  registerAllRRPairsForAllServices: registerAllRRPairsForAllServices,
  registerMQPairs: registerMQPairs
};
