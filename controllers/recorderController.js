const RRPair = require('../models/http/RRPair');
const requestNode = require('request');
const Recording = require('../models/http/Recording');
const async = require('async');



 /**
  * Recorder object
  *
  * This object is created whenever a new recording session is started. the recording router will route all appropriate transactions to this object 
  */
var Recorder = function(path,sut,remoteHost,remotePort,protocol,datatype,headerMask){
     this.path = path;
     
     //Ensure path starts with /
    if(this.path.substring(0,1) != "/")
        this.path = "/" + this.path;    
    this.model = Recording.create({
        sut : sut,
        path : path,
        remoteHost : remoteHost,
        protocol : protocol || 'REST',
        payloadType : datatype || 'JSON',
        remotePort : remotePort || 80,
        headerMask : headerMask || ['Content-Type'],
        service : {basePath : "/" + sut + path},
        rrpairs : new Array()
    },(function(err,newModel){
        this.model = newModel;
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
    myRRPair.reqData = req.body;
    myRRPair.queries = req.query;
    myRRPair.payloadType = this.model.payloadType;

    //Get relative path to base path for this RRPair
    var fullBasePath = req.baseUrl + "/live/" + this.model.sut + this.model.path;
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
                    return reject(err);
                }
                return resolve(remoteRsp,remoteBody);
            }).bind(this));
        }).then((function(remoteRsp,remoteBody){
            var body = remoteBody || remoteRsp.body;
            //Collect data for RR Pair
            myRRPair.resStatus = remoteRsp.statusCode;
            if(myRRPair.payloadType == "JSON"){
                myRRPair.resData = JSON.parse(body);
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
            }
        }).bind(this));
};




 module.exports = {
    Recorder: Recorder
  };
  
