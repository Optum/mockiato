const RRPair = require('../models/http/RRPair');
const requestNode = require('request');
const Recording = require('../models/http/Recording');
const async = require('async');
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
            basePath : path,
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
    if(diff == "/")
        diff = "";
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
    options.url = (req.secure ? "https" : "http") + "://" + this.model.remoteHost + ":" + this.model.remotePort + this.model.path + diff;
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

            //Add RRPair to model and save
            this.model.service.rrpairs.push(myRRPair);
            this.model.save();

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
    var recordingsRet; 
    var q = Recording.find({},function(err,docs){
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

    rsp.json(newRecorder);
}



 module.exports = {
    Recorder: Recorder,
    getRecordings : getRecordings,
    addRecorder : addRecorder,
    getRecordingById: getRecordingById,
    getRecorderRRPairsAfter : getRecorderRRPairsAfter
  };
  