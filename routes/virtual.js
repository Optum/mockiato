const express = require('express');
const router = express.Router();
const xml2js = require('xml2js');
const debug = require('debug')('matching');
const Service = require('../models/http/Service');
const removeRoute = require('../lib/remove-route');
const logger = require('../winston');

// function to simulate latency
function delay(ms,msMax) {
  if ((!ms || ms === 1) && (!msMax || msMax <= 1)) {
    return function(req, res, next) {
      return next();
    };
  }
  return function(req, res, next) {
    if (!req.delayed) {
      //If we have a random range set, adjust ms delay within that range
      let finalDelay = ms;
      if(msMax && msMax > ms){
        finalDelay += Math.round(Math.random() * (msMax - ms));
      }
      req.delayed = true;
      return setTimeout(next, finalDelay);
    }

    return next();
  };
}

// function for registering an RR pair on a service
function registerRRPair(service, rrpair) {
  let msg;
  let path;
  let matched;

  if (rrpair.path) path = service.basePath + rrpair.path;
  else path = service.basePath;

  router.all(path, delay(service.delay, service.delayMax), function(req, resp, next) {
    req.msgContainer = req.msgContainer || {};
    req.msgContainer.reqMatched = false;

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
      msg = "HTTP methods don't match";
      req.msgContainer.reason = msg;
      logEvent(msg);
      return next();
    }
    debug("Request matched? " + matched);
    
    // run the next callback if request not matched
    if (!matched) {
      msg = "Request bodies don't match";
      req.msgContainer.reason = msg;
      logEvent(msg);
      return next();
    }

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
                  logEvent(err);
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
            
            logEvent('received payload (from template): ' + JSON.stringify(trimmedPayload, null, 2));
            logEvent('expected payload (from template): ' + JSON.stringify(trimmedReqData, null, 2));

            match = deepEquals(trimmedPayload, trimmedReqData);
            
            if (match) break;
          }
        }
      }

      if ((!rrpair.reqData && JSON.stringify(payload, null, 2)=='{}')|| match) {
        // check request queries
        if (rrpair.queries) {
          // try the next rr pair if no queries were sent
          if (!req.query) {
            debug("expected queries in request");
            return false;
          }
          let matchedQueries = true;

          const expectedQueries = Object.entries(rrpair.queries);
          expectedQueries.forEach(function(queryVal) {
            const sentQuery = req.query[queryVal[0]];
            
            if (sentQuery != queryVal[1]) {
              matchedQueries = false;
              logEvent('expected query: ' + queryVal[0] + ': ' + queryVal[1]);
              logEvent('received query: ' + queryVal[0] + ': ' + sentQuery);
            }
          });

          if (!matchedQueries) return false;
        }

        // check request headers
        if (rrpair.reqHeaders) {
          let matchedHeaders = true;
          const expectedHeaders = Object.entries(rrpair.reqHeaders);

          expectedHeaders.forEach(function(keyVal) {
            // skip content-type header
            if (keyVal[0].toLowerCase() !== 'content-type') {
              const sentVal = req.get(keyVal[0]);
              if (sentVal != keyVal[1]) {
                // try the next rr pair if headers do not match
                matchedHeaders = false;
                logEvent('expected header: ' + keyVal[0] + ': ' + keyVal[1]);
                logEvent('received header: ' + keyVal[0] + ': ' + sentVal);
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
      logEvent("expected payload: " + JSON.stringify(reqData, null, 2));
      logEvent("received payload: " + JSON.stringify(payload, null, 2));

      return false;
    }

    // function to set headers for response
    function setRespHeaders() {
      var resHeaders = rrpair.resHeaders;
      if (resHeaders) {   
      
      
        if(rrpair.label){
          resHeaders['Mockiato-RRPair-Label'] = rrpair.label;
        }
       
        if (!resHeaders['Content-Type']) {
          setContentType();
        }
        
        resp.set(resHeaders);
        return;
      }else if(rrpair.label){

        resp.set( { "Mockiato-RRPair-Label": rrpair.label});
      }
      
      setContentType();
    }
    
    function setContentType() {
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
  });
}

// register all RR pairs for all SOAP / REST services from db
function registerAllRRPairsForAllServices() {
  Service.find({ $or: [{ type:'SOAP' }, { type:'REST' }] }, function(err, services) {
    if (err) {
      logEvent('Error registering services: ' + err);
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
      logEvent('Error registering services: ' + e);
    }
  });
}

function deregisterRRPair(service, rrpair) {
  let relPath = rrpair.path || '';
  let fullPath = '/virtual' + service.basePath + relPath;
  removeRoute(require('../app'), fullPath);
}

function registerService(service) {
  if (!service || !service.rrpairs) {
    logEvent('cannot register undefined service');
    return;
  }

  service.rrpairs.forEach(function(rrpair){
    registerRRPair(service, rrpair);
  });
}

function deregisterService(service) {
  if (!service || !service.rrpairs) {
    logEvent('cannot deregister undefined service');
    return;
  }

  service.rrpairs.forEach(function(rrpair){
    deregisterRRPair(service, rrpair);
  });
}

function logEvent(msg) {
  debug(msg);
  logger.info(msg);
}

module.exports = {
  router: router,
  registerService: registerService,
  registerRRPair: registerRRPair,
  deregisterRRPair: deregisterRRPair,
  deregisterService: deregisterService,
  registerAllRRPairsForAllServices: registerAllRRPairsForAllServices
};
