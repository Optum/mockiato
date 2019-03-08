const express = require('express');
const router = express.Router();
const xml2js = require('xml2js');
const debug = require('debug')('matching');
const Service = require('../models/http/Service');
const removeRoute = require('../lib/remove-route');
const invoke = require('./invoke');
const matchTemplateController = require('../controllers/matchTemplateController');

  
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
  let label;
  let matched;

  if (rrpair.path) path = service.basePath + rrpair.path;
  else path = service.basePath;

  if (rrpair.label) label = rrpair.label;

  router.all(path, delay(service.delay, service.delayMax), function(req, resp, next) {
    //Function for handling incoming req against this RR pair
    var processRRPair = function(){
      req.msgContainer = req.msgContainer || {};
      req.msgContainer.reqMatched = false;
      delete req._Mockiato_Flat_ReqData;
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

      logEvent(path, label, "Request matched? " + matched);
      
      // run the next callback if request not matched
      if (!matched) {
        msg = "Request bodies don't match";
        req.msgContainer.reason = msg;
        logEvent(path, label, msg);
        return next();
      }
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

      let templates = service.matchTemplates;
      var templateOptions;
      if (templates && templates.length && templates[0] != "") {
      
        // match based on template
      
        let flatPayload, flatReqData;

        //Check for cached flats. Cache flats if not done yet
        if(req._Mockiato_Flat_Payload)
          flatPayload = req._Mockiato_Flat_Payload;
        else{
          flatPayload = flattenObject(payload);
          req._Mockiato_Flat_Payload = flatPayload;
        }
        if(req._Mockiato_Flat_ReqData)
          flatReqData = req._Mockiato_Flat_Payload;
        else{
          flatReqData = flattenObject(reqData);
          req._Mockiato_Flat_ReqData = flatReqData;
        }
        if(!(req._Mockiato_Flat_Templates)){
          req._Mockiato_Flat_Templates = [];
        }

        for (let i = 0; i < templates.length; i++) {
          let template = templates[i];
          

          if (!template) {
            break;
          }
          let flatTemplate;
          if(req._Mockiato_Flat_Templates.length > i){
            flatTemplate = req._Mockiato_Flat_Templates[i];
            if(flatTemplate === false)
              continue;
          }else{
            flatTemplate = matchTemplateController.parseAndFlattenTemplate(template,rrpair.payloadType);
            
            req._Mockiato_Flat_Templates.push(flatTemplate);
            if(flatTemplate === false)
              continue;
            
          }

          templateOptions = matchTemplateController.matchOnTemplate(flatTemplate,rrpair,flatPayload,flatReqData,path);
          if(templateOptions !== false)
            match = true;
          if (match) break;
        }
      }
      else {
        match = deepEquals(payload, reqData);
      }
      
      if (!rrpair.reqData || match) {
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
              logEvent(path, label, 'expected query: ' + queryVal[0] + ': ' + queryVal[1]);
              logEvent(path, label, 'received query: ' + queryVal[0] + ': ' + sentQuery);
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
                logEvent(path, label, 'expected header: ' + keyVal[0] + ': ' + keyVal[1]);
                logEvent(path, label, 'received header: ' + keyVal[0] + ': ' + sentVal);
              }
            }
          });

          if (!matchedHeaders) return false;
        }

        // send matched data back to client
        setRespHeaders();
        if (rrpair.resStatus && rrpair.resData) {
          resp.status(rrpair.resStatus);
          //Give .send a buffer instead of a string so it won't yell at us about content-types


          let resString = typeof rrpair.resData == "object" ? JSON.stringify(rrpair.resData) : rrpair.resData;

          //Handle template mapping
          if(templateOptions){
            resString = matchTemplateController.applyTemplateOptionsToResponse(resString,templateOptions);
          }


          resp.send(new Buffer(resString));
        }
        else if (!rrpair.resStatus && rrpair.resData) {
          //Give .send a buffer instead of a string so it won't yell at us about content-types
          let resString = typeof rrpair.resData == "object" ? JSON.stringify(rrpair.resData) : rrpair.resData;

          //Handle template mapping
          if(templateOptions){
            resString = matchTemplateController.applyTemplateOptionsToResponse(resString,templateOptions);
          }


          resp.send(new Buffer(resString));
        }
        else if (rrpair.resStatus && !rrpair.resData) {
          resp.sendStatus(rrpair.resStatus);
        }
        else {
          resp.sendStatus(200);
        }

        invoke.incrementTransactionCount(service._id);
        // request was matched
        return true;
      }

      // request was not matched
      logEvent(path, label, "expected payload: " + JSON.stringify(reqData, null, 2));
      logEvent(path, label, "received payload: " + JSON.stringify(payload, null, 2));

      return false;
    }

    // function to set headers for response
    function setRespHeaders() {
      var resHeaders = rrpair.resHeaders;
      if (resHeaders) {   
      
      
        if(label){
          resHeaders['Mockiato-RRPair-Label'] = label;
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

    //Check for live invo override header
    var override = req.get("_mockiato-use-live");
    var overrideIsSet = false;
    if(override){
      if(service.liveInvocation.remoteHost != undefined && service.liveInvocation.remotePort != undefined){
        override = override.toLowerCase() === "true";
        overrideIsSet = true;
      }else{
        override = false;
      }
    }

    //If live invocation is enabled, and invoke first is selected, and we haven't run this yet...
    if(((service.liveInvocation && service.liveInvocation.enabled && service.liveInvocation.liveFirst && !overrideIsSet) || (override && overrideIsSet)) &&  !req._mockiatoLiveInvokeHasRun){
      var prom = invoke.invokeBackendVerify(service,req);
      req._mockiatoLiveInvokeHasRun = true;
      prom.then(function(remoteRsp,remoteRspBody){
        resp.set('_mockiato-is-live-backend','true');
        invoke.incrementTransactionCount(service._id);
        invoke.mapRemoteResponseToResponse(resp,remoteRsp,remoteRspBody);
        
      },function(err){
        resp.set('_mockiato-is-live-backend','false');
        resp.set('_mockiato-live-fail-reason',err.message);
        processRRPair();
      });
    }else{
      resp.set('_mockiato-is-live-backend','false');
      processRRPair();
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
          if(service.liveInvocation && service.liveInvocation.enabled){
            invoke.registerServiceInvoke(service);
          }
        }
      });
    }
    catch(e) {
      console.log(e);
      debug('Error registering services: ' + e);
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
    debug('cannot register undefined service');
    return;
  }

  service.rrpairs.forEach(function(rrpair){
    registerRRPair(service, rrpair);
  });
}

function deregisterService(service) {
  if (!service || !service.rrpairs) {
    debug('cannot deregister undefined service');
    return;
  }

  service.rrpairs.forEach(function(rrpair){
    deregisterRRPair(service, rrpair);
  });
}



module.exports = {
  router: router,
  registerService: registerService,
  registerRRPair: registerRRPair,
  deregisterRRPair: deregisterRRPair,
  deregisterService: deregisterService,
  registerAllRRPairsForAllServices: registerAllRRPairsForAllServices
};
