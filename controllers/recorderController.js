const requestNode = require('request');
const Recording = require('../models/http/Recording');
const routing = require('../routes/recording');

var activeRecorders = {};

 /**
  * Recorder object
  *
  * This object is created whenever a new recording session is started. the recording router will route all appropriate transactions to this object 
  */
var Recorder = function(name,path,sut,remoteHost,remotePort,protocol,headerMask){
     this.path = path;
     
     //Ensure path starts with /
    if(this.path.substring(0,1) != "/")
        this.path = "/" + this.path;     
   
    this.model = Recording.create({
        sut : {name:sut},
        path : path,
        remoteHost : remoteHost,
        protocol : protocol || 'REST',
        remotePort : remotePort || 80,
        headerMask : headerMask || ['Content-Type'],
        service : {
            basePath : path.substring(1),
            sut:{name:sut},
            name:name,
            type:protocol
        },
        name: name
    },(function(err,newModel){
        this.model = newModel;
        activeRecorders[this.model._id] = this;
        if(!(this.model.headerMask))
            this.model.headerMask = [];
        
        if(!(this.model.headerMask['Content-Type']))
            this.model.headerMask.push('Content-Type');

        this.model.save(function(err){
            if(err) console.log(err);
        });
    }).bind(this));
  
 };


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
    
    console.log(req);

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
        try{
            myRRPair.reqData = JSON.parse(req.body);
        }catch(err){
            myRRPair.reqData = req.body;
        }
    }
    else
        myRRPair.reqData = req.body;


    //Get relative path to base path for this RRPair
    var fullBasePath = req.baseUrl + "/live/" + this.model.sut.name + this.model.path;
    var fullIncomingPath = req.baseUrl + req.path;
    var diff = fullIncomingPath.replace(fullBasePath,"");
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
    options.url = (req.secure ? "https" : "http") + "://" + this.model.remoteHost + ":" + this.model.remotePort + this.model.path + "/" + diff;
    options.method = req.method;
    options.headers = req.headers;
    if(req._body) options.body = req.body;

    //Handle JSON parsed body
    if(typeof options.body != "string")
        options.body = JSON.stringify(options.body);
    
    //Make request
    return new Promise(function(resolve,reject){

        requestNode(options,(function(err,remoteRsp,remoteBody){
                if(err) { 
                    console.log(err);
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
                    console.log(err);
                    myRRPair.resData = body;
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
            //Add RRPair to model and save
            if(!duplicate){
                this.model.service.rrpairs.push(myRRPair);
                this.model.save();
            }

            //Send back response to user
            rsp.status(remoteRsp.statusCode);
            rsp.set(remoteRsp.headers);
            if(body){
                rsp.send(body);
            }else{
                rsp.end();
            }
        }).bind(this));
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
function beginRecordingSession(label,path,sut,remoteHost,remotePort,protocol,headerMask){
    var newRecorder = new Recorder(label,path,sut,remoteHost,remotePort,protocol,headerMask); 
    routing.bindRecorderToPath("/" + sut + path + "*",newRecorder);
    return newRecorder;
}

function removeRecorder(req,rsp){
    var id = req.params.id;
    var recorder = activeRecorders[id];
    if(recorder){
        routing.unbindRecorder(recorder);
        delete activeRecorders[id];
    }
    Recording.deleteOne({_id:id},function(err){
        if(err)
            handleError(err,rsp,500);
        else{
            rsp.status(200);
            rsp.end();
        }
    });
   
}



/**
 * API call to add a recorder
 * TODO: Stop duplicate paths for recorders
 * @param {*} req express req
 * @param {*} rsp express rsp
 */
function addRecorder(req,rsp){
    var body = req.body;
    if(body.type == "SOAP")
        body.payloadType = "XML";
    var newRecorder = beginRecordingSession(body.name,body.basePath,body.sut,body.remoteHost,body.remotePort,body.type,body.headerMask);
    newRecorder.model.then(function(doc){
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
    removeRecorder: removeRecorder
  };
  
