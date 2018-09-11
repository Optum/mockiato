const express = require('express');
const router = express.Router();
const xml2js = require('xml2js');
const pause = require('connect-pause');
const debug = require('debug')('matching');
const Service = require('../models/Service');
const removeRoute = require('express-remove-route');

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

      const isGet = req.method === 'GET';
      if (!isGet) {
        if (rrpair.payloadType === 'XML') {
          xml2js.parseString(rrpair.reqData, function(err, data) {
            reqData = data;
          });
        }
        else {
          reqData = rrpair.reqData;
        }
      }

      if (isGet || deepEquals(payload, reqData)) {
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
            const sentVal = req.get(keyVal[0]);
            // try the next rr pair if headers do not match
            if (sentVal !== keyVal[1]) {
              matchedHeaders = false;
              debug('expected header: ' + keyVal[0] + ': ' + keyVal[1]);
              debug('received header: ' + keyVal[0] + ': ' + sentVal);
            }
          });

          if (!matchedHeaders) return false;
        }

        // send matched data back to client
        setRespHeaders();
        if (!rrpair.resStatus)
          resp.send(rrpair.resData);
        else
          resp.status(rrpair.resStatus).send(rrpair.resData);

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
        else {
          resp.set("Content-Type", "application/json");
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

function registerById(id) {
  Service.findById(id, function(err, service) {
    if (err) {
      debug('Error registering service: ' + err);
      return;
    }

    try {
      service.rrpairs.forEach(function(rr){
        removeRoute(require('../app'), '/virtual/' + service.basePath + rr.path);
      });

      if (service.running) {
        service.rrpairs.forEach(function(rrpair){
          registerRRPair(service, rrpair);
        });
      }
    }
    catch(e) {
      debug('Error registering service: ' + e);
    }
  });
}

// function to simulate latency
function delay(ms) {
  if (!ms || ms === 1) {
    return function(req, res, next) {
      return next();
    };
  }
  return pause(ms);
}

module.exports = {
  router: router,
  registerById: registerById,
  registerRRPair: registerRRPair,
  registerAllRRPairsForAllServices: registerAllRRPairsForAllServices
};
