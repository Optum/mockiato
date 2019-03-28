const express = require('express');
const router = express.Router();
const removeRoute = require('../lib/remove-route');
const requestNode = require('request');
const Service = require('../models/http/Service');
const MQService = require('../models/mq/MQService');
const timeBetweenTransactionUpdates = process.env.MOCKIATO_TRANSACTON_UPDATE_TIME || 5000;
const xml2js = require("xml2js");

var transactions = {};

/**
 * Log a transaction against given service
 * @param {*} serviceId ID of the service to increment
 */
function incrementTransactionCount(serviceId){
  if(transactions[serviceId]){
    transactions[serviceId]++;
  }else{
    transactions[serviceId] = 1;
  }
}

  /**
   * Saves transactions{} to the db, and clears transactions{}. 
   */
function saveTransactonCounts(){
    var myTransactions = transactions;
    transactions = {};
    for(let id in myTransactions){
        let q = {$inc:{txnCount:myTransactions[id]}};
        Service.findByIdAndUpdate(id, q, function(err, serv) {
            if (!serv) {
                MQService.findByIdAndUpdate(id,q).exec();
            }
        });
    }
    setTimeout(saveTransactonCounts,timeBetweenTransactionUpdates);
}

/**
 * Takes a response from a remote host and maps into express's response to give to the client
 * @param {*} remoteRsp Response from remote host
 * @param {*} rsp Express response
 */
function mapRemoteResponseToResponse(rsp,remoteRsp,remoteBody){
    var body = remoteBody || remoteRsp.body;
    rsp.status(remoteRsp.statusCode);

    rsp.set(remoteRsp.headers);
    rsp.set('_mockiato-is-live-backend','true')
    if(body){
        rsp.send(new Buffer(body));
    }else{
        rsp.end();
    }
    
}


/**
 * Creates an RR pair from 1) an incoming request to Mockiato and 2) a response gotten from a remote server by forwarding that request and 3) An associated service
 * 
 * @param {*} req Express req 
 * @param {*} res Response from remote server
 * @return An object that should conform to the RRPair spec, NOT an RRPair model. 
 */
function createRRPairFromReqRes(req,res,service){

    //Build from req first
    var myRRPair = {}
    myRRPair.verb = req.method;
    myRRPair.queries = req.query;
    var contentType = req.get("content-type");
    if(contentType == "text/json" || contentType == "application/json"){
        myRRPair.payloadType = "JSON";
    }else if(contentType == "text/xml" || contentType == "application/xml" || service.type == "SOAP"){
        myRRPair.payloadType = "XML";
        xml2js.parseString(req.body, function (err, result) {
            if(err)
                myRRPair.payloadType = "PLAIN";
            else
            xml2js.parseString(res.body, function (err, result) {
                if(err)
                    myRRPair.payloadType = "PLAIN";
            });
        });
    }else{
        myRRPair.payloadType = "PLAIN";
    }
    if(myRRPair.payloadType == "JSON"){
        //Even if its supposed to be JSON, and it fails parsing- record it! This may be intentional from the user
        if(typeof req.body == "string"){
            try{
                myRRPair.reqData = JSON.parse(req.body);
            }catch(err){
                myRRPair.reqData = req.body;
                myRRPair.payloadType = "PLAIN";
            }
        }else{
            myRRPair.reqData = req.body;
        }
    }
    else
        myRRPair.reqData = req.body;

    //Get relative path to base path for this RRPair
    var fullBasePath = req.baseUrl + service.basePath;
    var fullIncomingPath = req.baseUrl + req.path;
    var diff = fullIncomingPath.replace(new RegExp(escapeRegExp(fullBasePath),"i"),"");
    if(diff && diff[diff.length-1] == "/"){
        diff = diff.substring(0,diff.length-1); 
    }
    if(diff.substring(0,1) == "/")
        diff = diff.substring(1);
    
    if(diff)
        myRRPair.path = "/" + diff;

    //Record response info to rr pair
    myRRPair.resStatus = res.statusCode;
    if(myRRPair.payloadType == "JSON"){
        //Even if its supposed to be JSON, and it fails parsing- record it! This may be intentional from the user
        try{
            myRRPair.resData = JSON.parse(res.body);
        }catch(err){
            myRRPair.resData = res.body;
            myRRPair.payloadType = "PLAIN";
        }
    }else{
        myRRPair.resData = res.body;
    }
    myRRPair.resHeaders = res.headers;


    
    return myRRPair;
}
  
  /**
   * Makes a backend request based on the incoming request and the service associated. 
   * Returns promise for response
   * @param {*} service Service associated with this request
   * @param {*} req Express request
   */
  function invokeBackend(service,req){
    
      //Extract and convert req params to options for our remote request
      var options = {};
      options.method = req.method;
      options.headers = req.headers;
    
      if(options.headers['content-length'])
        delete options.headers['content-length'];
    
      options.qs = req.query;
    
      if(req._body) 
        options.body = req.body;
    
      //Handle JSON parsed body
      if(typeof options.body != "string")
        options.body = JSON.stringify(options.body);
    
      //Build URL
      var invokeOptions = service.liveInvocation;
      var reg = new RegExp("/" + service.sut.name,"i");
      var basePath = service.basePath.replace(reg,"");
      if(service.liveInvocation.remoteBasePath){
        basePath = service.liveInvocation.remoteBasePath;
      }
    
      //Find subpath + append
      var diffReg = new RegExp(service.basePath,'i');
      var diff = req.path.replace(diffReg,"");
      var url = (invokeOptions.ssl ? "https://" : "http://") + invokeOptions.remoteHost + ":" + invokeOptions.remotePort + basePath + diff;
      options.url = url;
    
      //Make request, return promise
      return new Promise(function(resolve,reject){
        
                requestNode(options,(function(err,remoteRsp,remoteBody){
                        
                    if(err) { 
                        return reject(err);
                    }

                    if(service.liveInvocation.record){
                        logEvent(req.path,service.name,"Is recording id " + service._id);

                        var rrpair = createRRPairFromReqRes(req,remoteRsp,service);
                        Service.update({_id:service._id},
                            {$push:
                                {'liveInvocation.recordedRRPairs':rrpair}
                            },
                            function(err,raw){
                                if(err){
                                    logEvent(req.path,service.name,err);
                                    logEvent(req.path,service.name,raw);
                                }
                            });
                    }
                        
                        
                    return resolve(remoteRsp,remoteBody);
                }).bind(this));
        
            });
    
    
    
    }
    
    /**
     * Invokes the backend specified in this service, and responds with response if successful
     * Returns promise. Promise rejects if this service fails (either error or matches a failure code/string), resolves otherwise.
     * @param {*} service Service associated with this request
     * @param {*} req Express request
     * @param {*} rsp Express response
     */
    function invokeBackendVerify(service,req,rsp){
    
      //Make request
      var request = invokeBackend(service,req);
      return new Promise(function(resolve,reject){
        request.then(function(remoteRsp,remoteRspBody){
    
          //Check for failure status codes + strings
          var remoteStatus = remoteRsp.statusCode;
          if(service.liveInvocation.failStatusCodes.includes(remoteStatus)){
            reject(new Error("Found Status Code " + remoteStatus));
          }
          service.liveInvocation.failStrings.forEach(function(failString){
            if(failString != "" && ((remoteRspBody && remoteRspBody.includes(failString)) || (remoteRsp.body && remoteRsp.body.includes(failString)))){
              reject(new Error("Found String '" + failString + "' in response body."));
            }
          });
    
          resolve(remoteRsp,remoteRspBody);
        },function(err){
          reject(err);
        });
      });
    }


/**
 * Registers an invoke handler to catch after the virtual handler.
 * Handles both post-invoke and any pre-invokes on a path that the virtual handler does not catch (unregistered sub-path)
 * @param {Service} service Service to register
 */
function registerServiceInvoke(service){
    //Catch all paths under service basepath
    var path = service.basePath + "/?*";
    router.all(path,function(req,rsp,next){

        var override = req.get("_mockiato-use-live");
        var overrideIsSet = false;
        if(override){
            overrideIsSet = true;
            override = override.toLowerCase() === "true";
        }
        if(service.liveInvocation && service.liveInvocation.enabled && (!overrideIsSet || override)){
            //This should trigger only if it is a "pre-invoke" and the service itself doesn't catch it at all (no sub-path match)
            if(service.liveInvocation.liveFirst && !req._mockiatoLiveInvokeHasRun){
                invokeBackendVerify(service,req).then(function(remoteRsp,remoteRspBody){
                    rsp.set('_mockiato-is-live-backend','true');
                    incrementTransactionCount(service._id);
                    mapRemoteResponseToResponse(rsp,remoteRsp,remoteRspBody);
                },function(err){
                    //if fails for any reason, mark error and continue
                    rsp.set('_mockiato-is-live-backend','false');
                    rsp.set('_mockiato-live-fail-reason',err.message);
                    next();
                });
            //Post-invoke
            }else if(!(service.liveInvocation.liveFirst)){
                invokeBackend(service,req).then(function(remoteRsp,remoteRspBody){
                    rsp.set('_mockiato-is-live-backend','true');
                    incrementTransactionCount(service._id);
                    mapRemoteResponseToResponse(rsp,remoteRsp,remoteRspBody);
                },function(err){
                    //if fails for any reason, mark error and continue
                    rsp.set('_mockiato-is-live-backend','false');
                    rsp.set('_mockiato-live-fail-reason',err.message);
                    next();
                });
            }
            else{
                rsp.set('_mockiato-is-live-backend','false');
                next();
            }
        }else{
            rsp.set('_mockiato-is-live-backend','false');
            next(); 
        }
    });
}

/**
 * Unregisters an invoke handler
 * @param {*} service  Service to unregister
 */
function deregisterServiceInvoke(service){
    var path = service.basePath + "/?*";
    removeRoute(require('../app'), path);
}

module.exports = {
    deregisterServiceInvoke : deregisterServiceInvoke,
    registerServiceInvoke : registerServiceInvoke,
    invokeBackend : invokeBackend,
    invokeBackendVerify : invokeBackendVerify,
    mapRemoteResponseToResponse : mapRemoteResponseToResponse,
    incrementTransactionCount : incrementTransactionCount,
    router : router
};

setTimeout(saveTransactonCounts,timeBetweenTransactionUpdates);