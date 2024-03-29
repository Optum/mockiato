const requestNode = require('request');
const Recording = require('../models/http/Recording');
const routing = require('../routes/recording');
const manager = require('../lib/pm2/manager');
const constants = require('../lib/util/constants');

var activeRecorders = {};





 /**
  * Recorder object
  *
  * This object is created whenever a new recording session is started. the recording router will route all appropriate transactions to this object 
  * Can instead pass an ID to a Recording document to 'name', and create an instance based on that recorder. 
  */
var Recorder = function(name,path,sut,remoteHost,remotePort,protocol,headerMask,ssl,filters,creator, rsp){

    var rec = this;
    
    //If passed ID for Recording document...
    if(arguments.length == 1){
        rec.model = new Promise(function(resolve,reject){
            Recording.findById(name,function(err,doc){
                if(err){
                    reject(err);
                }else{
                    doc.running = true;
                    doc.save(function(err,doc){
                        if(err){
                            reject(err);
                        }else if(doc){                        
                            rec.model = doc;
                            syncWorkersToNewRecorder(rec);
                            resolve(doc);
                        }else{
                            reject(new Error("doc save failed"));
                        }
                    });
                }

            });
        });
    }else{

        this.path = path;
        
        //Ensure path starts with /
        if(this.path.substring(0,1) != "/")
            this.path = "/" + this.path;     
        
        //Make sure it starts with ONLY one /
        this.path.replace(/^\/+/,"/");
        this.model = Recording.create({
            sut : {name:sut},
            path : path,
            remoteHost : remoteHost,
            protocol : protocol || 'REST',
            remotePort : remotePort || 80,
            headerMask : headerMask || ['Content-Type'],  
            service : {
                basePath : path,
                sut:{name:sut},
                name:name,
                type:protocol
            },
            name: name,
            ssl:ssl,
            filters:filters
        },(function(err,newModel){
            if(err) {
                handleBackEndValidationsAndErrors(err, rsp);
                return;
            }
            this.model = newModel;
            
            if(!(this.model.headerMask))
                this.model.headerMask = [];
            
            if(!(this.model.headerMask['Content-Type']))
                this.model.headerMask.push('Content-Type');

            this.model.save(function(err, recording){
                if(err) {
                    handleBackEndValidationsAndErrors(err, rsp);
                    return;
                }
            });
            syncWorkersToNewRecorder(this);
        }).bind(this));
    }
  
 };

/**
 * This function handle mongoose validation Errors or any other error at backend.
 * @param {*} err err Object contains error from backEnd.
 * @param {*} res response Object required to send response error code.
 * @returns blank to stop further processing and sends 400(bad request from mongoose validations) or 500(internal error) to clients.
 */
/* To Do:- This below function is used in both serviceController and recorderController. We 
           should keep this functiona at common place and should be call from ther at both places. */
           function handleBackEndValidationsAndErrors(err, res) {
            {
              switch (err.name) {
                case 'ValidationError':
                LOOP1:
                  for (let field in err.errors) {
                    switch (err.errors[field].kind) {
                      case 'required':
                        handleError(err.errors[field].message, res, 400);
                        break LOOP1;
                      case 'user defined':
                      handleError(err.errors[field].message, res, 400);
                      break LOOP1;
                      case 'enum':
                      handleError(err.errors[field].message, res, 400);
                      break LOOP1;
                      case 'Number':
                      handleError(err.errors[field].message, res, 400);
                      break LOOP1;
                      default:
                      handleError(err.errors[field].message, res, 400);
                      break LOOP1;
                    }
                  }
                  break;
                default:
                  handleError(err, res, 500);
              }
              return;
            }
          }

function registerRecorder(recorder){
    activeRecorders[recorder.model._id] = recorder;
    routing.bindRecorderToPath("/" + recorder.model.sut.name + recorder.model.path + "*",recorder);
}

 function syncWorkersToNewRecorder(recorder){
    var msg = { 
        recorder: recorder,
        action: "register"
    };
    manager.messageAll(msg)
    .then(function(workerIds) {
       registerRecorder(recorder);
    });
    
 }


// returns a stripped-down version on the rrpair for logical comparison, request parts only
function stripRRPairForReq(rrpair) {
    return {
      verb: rrpair.verb || '',
      path: rrpair.path || '',
      payloadType: rrpair.payloadType || '',
      queries: rrpair.queries || {},
      reqHeaders: rrpair.reqHeaders || {},
      reqData: rrpair.reqData || {}
    };
  }


 /**
  * Event handler for incoming recording requests. Saves incoming request, then forwards to configured host.
  * Then records host's response, and forwards response to user. 
  */
 Recorder.prototype.incomingRequest = function(req,rsp,next){
    


    //Start contructing RRPair, pull info we can from just request side before we forward the request
    var myRRPair = {}
    myRRPair.verb = req.method;
    myRRPair.queries = req.query;
    var contentType = req.get("content-type");
    if(contentType == "text/json" || contentType == "application/json"){
        myRRPair.payloadType = "JSON";
    }else if(contentType == "text/xml" || contentType == "application/xml"){
        myRRPair.payloadType = "XML";
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
    var fullBasePath = req.baseUrl + "/live/" + this.model.sut.name + this.model.path;
    var fullIncomingPath = req.baseUrl + req.path;
    var diff = fullIncomingPath.replace(new RegExp(escapeRegExp(fullBasePath),"i"),"");
    if(diff && diff[diff.length-1] == "/"){
        diff = diff.substring(0,diff.length-1); 
    }
    if(diff.substring(0,1) == "/")
        diff = diff.substring(1);
    
    if(diff)
        myRRPair.path = diff;

    //Go through header mask and include headers specified
    if(this.model.headerMask){
        myRRPair.reqHeaders = {};
        this.model.headerMask.forEach(function(headerName){
            myRRPair.reqHeaders[headerName] = req.get(headerName);

        });
    }

    //Start creating req options
    var options = {}
    //Create full URL to remote host
    options.uri = (this.model.ssl ? "https" : "http") + "://" + this.model.remoteHost + ":" + this.model.remotePort + this.model.path + (diff ? "/" + diff : "");
    options.method = req.method;
    options.headers = req.headers;
    options.headers.host = this.model.remoteHost;
    if(options.headers['content-length'])
        delete options.headers['content-length'];

    options.qs = req.query;
    if(req._body) options.body = req.body;

    //Handle JSON parsed body
    if(typeof options.body != "string")
        options.body = JSON.stringify(options.body);
    
    //Make request
    var promise =  new Promise(function(resolve,reject){

        requestNode(options,(function(err,remoteRsp,remoteBody){
                
            if(err) { 
                return reject(err);
            }
            return resolve(remoteRsp,remoteBody);
        }).bind(this));

    }).then((function(remoteRsp,remoteBody){
        var body = remoteBody || remoteRsp.body;
        //Collect data for RR Pair
        myRRPair.resStatus = remoteRsp.statusCode;
        if(myRRPair.payloadType == "JSON"){

            //Even if its supposed to be JSON, and it fails parsing- record it! This may be intentional from the user
            try{
                myRRPair.resData = JSON.parse(body);
            }catch(err){
                myRRPair.resData = body;
                myRRPair.payloadType = "PLAIN";
            }
        }else{
            myRRPair.resData = body;
        }
        myRRPair.resHeaders = remoteRsp.headers;


        //Test for duplicate
        var stripped = stripRRPairForReq(myRRPair);
        var duplicate = false;

        for(let rrpair of this.model.service.rrpairs){
            if(deepEquals(stripRRPairForReq(rrpair),stripped)){
                duplicate = true;
                break;
            }
        }

        
        //Check our filters
        var filters = this.model.filters;
        var addThisRRPair = true;
        var filteredReason = null;
        if(filters && filters.enabled && body){
            if(filters.bodyStrings.length){
                for(let i = 0; i < filters.bodyStrings.length; i++){
                    if(body.includes(filters.bodyStrings[i])){
                        addThisRRPair = false;
                        filteredReason = 'Found string "' + filters.bodyStrings[i] + '" in response body.'
                        break;
                    }
                }
            }
            if(addThisRRPair && filters.statuses.length){
                for(let i = 0; i < filters.statuses.length; i++){
                    if(remoteRsp.statusCode == filters.statuses[i]){
                        addThisRRPair = false;
                        filteredReason = 'Found status code "' + filters.statuses[i] + '" in response.'
                        break;
                    }
                }
            }
            if(addThisRRPair && filters.headers.length){
                for(let i = 0; i < filters.headers.length; i++){
                    let header = filters.headers[i];
                    if(remoteRsp.headers[header.key] && remoteRsp.headers[header.key] == header.value){
                        addThisRRPair = false;
                        filteredReason = 'Found header "' + header.key + '" with value "' + header.value + '" in response headers.'
                        break;
                    }
                }
            }
        }


        //Push RRPair to model, then update our local model  
        if(!duplicate && addThisRRPair){
            Recording.update({_id : this.model._id} ,
                {$push: 
                    {"service.rrpairs":myRRPair}
                },(function(error,doc){
                    if(error)
                        console.log(error);
                }).bind(this));
        }

        //Send back response to user
        rsp.status(remoteRsp.statusCode);
        var headers = remoteRsp.headers;

        //Add reason for filtered, if filtered
        if(!addThisRRPair && filteredReason){
            headers['_mockiato-filtered-reason'] = filteredReason;
        }
        if(headers['content-type']){
            rsp.type(headers['content-type'])
            delete headers['content-type'];
        }
        rsp.set(remoteRsp.headers);
        if(body){
            rsp.send(new Buffer(body));
        }else{
            rsp.end();
        }
    }).bind(this));

    promise.catch(function(err){
        handleError(err,rsp,500);
    });
};



/**
 * API Call to get all current recordings
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function getRecordings(req,rsp){
     Recording.find({},function(err,docs){
        if(err){
            handleError(err,rsp,500);
            return;
        }

        //If the recorder still exists and is recording, flag it
        for(var i = 0; i < docs.length; i++){
            docs[i].active = activeRecorders[docs[i]._id] ? true : false;
        }


        rsp.json(docs);
    });
}

/**
 * API call to get a specific recording
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function getRecordingById(req,rsp){
    Recording.findById(req.params.id,function(err,docs){
        if(err){
            handleError(err,rsp,500);
            return;
        }
        rsp.json(docs);
        
    });
}

/**
 * API call to get a specific recording based on SUT
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function getRecordingBySystem(req,rsp){
    let allRecorders = [];
    
      const query = { 'sut.name': req.params.name };
    
    Recording.find(query,function(err,docs){
        if(err){
            handleError(err,rsp,500);
            return;
        }
        console.log("Found Recorder with SUT",docs);
        allRecorders = docs;
       return rsp.json(allRecorders);
        
    });
}

/**
 * API call to get RR pairs for a recorder after a certain index, for use in active update/polling
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function getRecorderRRPairsAfter(req,rsp){

    Recording.findById(req.params.id,function(err,docs){
        if(err){
            handleError(err,rsp,500);
            return;
        }

        if(docs)
            rsp.json(docs.service.rrpairs.slice(req.params.index));
        else
            rsp.json(new Array());
        
    });
}



/**
 * Makes sure no active recorder has the same sut + a path that would overlap with this one. Not actually a 'duplicate' so much as a collision
 * Returns false if there's no collision
 */
function findDuplicateRecorder(sut,path){
    for(let recorder in activeRecorders){
        recorder = activeRecorders[recorder];
        if(recorder.model.sut.name == sut){
            var recPath = recorder.model.path;
            if(recPath == path.substring(0,recPath.length) || path == recPath.substring(0,path.length)){
                return true;
            }
            
        }
    }
    return false;
}
    
/**
 * Initialize a recording session on /recording/live/{{SUT}}/{{PATH}} 
 * @param {string} label name of this recorder
 * @param {string} path sub-path to be recording on
 * @param {string} sut  SUT this belongs to
 * @param {string} remoteHost remote host to connect to
 * @param {integer} remotePort remote port to connect to 
 * @param {string} protocol  SOAP/REST
 * @param {string} dataType  XML/JSON/etc
 * @param {array{string}} headerMask array of headers to save
 */
function beginRecordingSession(label,path,sut,remoteHost,remotePort,protocol,headerMask,ssl,filters,creator, rsp){
    var newRecorder = new Recorder(label,path,sut,remoteHost,remotePort,protocol,headerMask,ssl,filters,creator, rsp); 
   
    return newRecorder;
}


/**
 * API call to remove a recorder based on ID. Returns blank 200 if success, or if no ID found (success guarantees ID does not exist in the DB)
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function removeRecorder(req,rsp){
    var recorder = activeRecorders[req.params.id];
    if(recorder){
        
        var msg = { 
            recorder: recorder, 
            action:"deregister"
        };
        manager.messageAll(msg)
        .then(function(workerIds) {
            deregisterRecorder(recorder);
        });
    }
    Recording.deleteOne({_id:req.params.id},function(err){
        if(err)
            handleError(err,rsp,500);
        else{
            rsp.status(200);
            rsp.end();
        }
    });
   
}

/**
 * API call to stop a recorder based on ID.
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function stopRecorder(req,rsp){
    var recorder = activeRecorders[req.params.id];
    if(recorder){
        recorder.model.running = false;
        recorder.model.save(function(err,doc){
            rsp.status(200);
            rsp.json(doc);
            deregisterRecorder(recorder);
            
        });
        
    }else{
        handleError(new Error("No recorder found for that ID or recorder is already stopped."),rsp,404);
    }
   
}

function deregisterRecorder(recorder){
    routing.unbindRecorder(recorder);
    if(activeRecorders[recorder.model._id])
        delete activeRecorders[recorder.model._id];
}



/**
 * API call to add a recorder
 * TODO: Stop duplicate paths for recorders
 * @param {*} req express req
 * @param {*} rsp express rsp
 */
function addRecorder(req,rsp){
    var body = req.body;
    if (body.sut === undefined){
        handleError(constants.REQUIRED_SUT_PARAMS_ERR, rsp, 400);
        return;
      }
    if(body.basePath === undefined){
        handleError(constants.REQUIRED_BASEPATH_ERR, rsp, 400);
        return;
    }
    if(body.type == "SOAP")
        body.payloadType = "XML";
    if(findDuplicateRecorder(body.sut,body.basePath)){
        handleError(constants.DUP_RECORDER_PATH_BODY,rsp,400);
        return;
    }
    else{
        //need to refactor this..just pasa body and not so much parameters to beginRecordingSession function.
        var newRecorder = beginRecordingSession(body.name,body.basePath,body.sut,body.remoteHost,body.remotePort,body.type,body.headerMask,body.ssl,body.filters,body.creator, rsp);
        newRecorder.model.then(function(doc){
            rsp.json(doc);
        }).catch(function(err){
            handleError(err,rsp,500);
        });
    }
    
}


 /**
  * Starts an existing Recording into a Recorder object. 
  * @param {string} recorderId 
  * @return {Recorder} recorder object instantiated from Recording doc
  */
  function startRecorderFromId(recorderId){
    return new Recorder(recorderId);
}

/**
 * API call to start a recorder. :id is the id to a Recording document.  Starts up a Recorder based on the Recording doc. 
 * @param {*} req  express req
 * @param {*} rsp  express rsp
 */
function startRecorder(req,rsp){
    startRecorderFromId(req.params.id).model.then(function(doc){
        rsp.json(doc);
    }).catch(function(err){
        handleError(err,rsp,500);
    });
}



 module.exports = {
    Recorder: Recorder,
    getRecordings : getRecordings,
    addRecorder : addRecorder,
    getRecordingById: getRecordingById,
    getRecorderRRPairsAfter : getRecorderRRPairsAfter,
    removeRecorder: removeRecorder,
    registerRecorder: registerRecorder,
    deregisterRecorder: deregisterRecorder,
    startRecorder : startRecorder,
    stopRecorder : stopRecorder,
    getRecordingBySystem : getRecordingBySystem
  };
  

//On startup, start all recorders that should be active.
Recording.find({running:true},function(err,docs){
    if(docs){
        docs.forEach(function(doc){
            new Recorder(doc);
        });
    }else if(err){
        debug('error initializing recorders');
    }
});